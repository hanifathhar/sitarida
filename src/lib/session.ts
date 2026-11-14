import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE_NAME = "sitarida_session";
const TAHUN_COOKIE_NAME = "sitarida_tahun_id";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "sitarida-default-dev-secret-key-2026";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  username: string;
  namaLengkap: string;
  email: string;
  roleKode: string;
  roleNama: string;
  isCrossOpd: boolean;
  opdId: string | null;
  opdKode: string | null;
  opdNama: string | null;
  unitKerjaId?: string | null;
  unitKerjaKode?: string | null;
  unitKerjaNama?: string | null;
  levelAkses?: "LINTAS_OPD" | "OPD" | "UNIT";
  tahunAnggaranId?: string;
  tahunAnggaran?: number;
  permissions: string[];
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  // Simpan payload ringkas tanpa daftar permissions di JWT agar ukuran cookie jauh di bawah batas 4KB browser
  const compactPayload = {
    ...payload,
    permissions: [],
  };
  return new SignJWT(compactPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  const isSecure = process.env.COOKIE_SECURE === "true";
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  if (payload.tahunAnggaranId) {
    cookieStore.set(TAHUN_COOKIE_NAME, payload.tahunAnggaranId, {
      httpOnly: false,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(TAHUN_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;

  // Muat daftar permission terbaru secara live dari database berdasarkan roleKode aktif
  try {
    const role = await prisma.role.findUnique({
      where: { kode: session.roleKode },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (role) {
      return {
        ...session,
        roleNama: role.nama,
        permissions: role.permissions.map((rp) => rp.permission.kode),
      };
    }
  } catch {
    // Fallback ke permissions di token jika koneksi DB bermasalah sementara
  }

  return session;
}

export async function getSelectedTahunAnggaranId(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(TAHUN_COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;
  const session = await getSession();
  return session?.tahunAnggaranId || null;
}

export async function setSelectedTahunAnggaranId(tahunId: string) {
  const cookieStore = await cookies();
  const isSecure = process.env.COOKIE_SECURE === "true";
  cookieStore.set(TAHUN_COOKIE_NAME, tahunId, {
    httpOnly: false,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
