import NextAuth from "next-auth"
import { authOptions } from "../../../utils/authOptions"

// Create the handler
const handler = NextAuth(authOptions)

// Simple export for Next.js App Router
export { handler as GET, handler as POST }
