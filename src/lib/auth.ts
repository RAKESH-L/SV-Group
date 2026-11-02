import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
const cookieName = "sv_admin_session";
function secret() { const value = process.env.SESSION_SECRET; if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters."); return new TextEncoder().encode(value); }
export async function createSession(adminId: string) { const token = await new SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setSubject(adminId).setIssuedAt().setExpirationTime("8h").sign(secret()); (await cookies()).set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 }); }
export async function getAdminId() { const token = (await cookies()).get(cookieName)?.value; if (!token) return null; try { const { payload } = await jwtVerify(token, secret()); return payload.role === "admin" && payload.sub ? payload.sub : null; } catch { return null; } }
export async function destroySession() { (await cookies()).delete(cookieName); }
