import CredentialsProvider from "next-auth/providers/credentials";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from "../firebase";
import { AuthOptions, Session } from "next-auth";

export const authOptions: AuthOptions = {
  // Configure one or more authentication providers
  pages: {
    signIn: '/signin',
    error: '/signin?error=true', // Add custom error page
  },
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {},
      async authorize(credentials): Promise<any> {
        try {
          if (!credentials || !(credentials as any).email || !(credentials as any).password) {
            console.error('Missing credentials');
            throw new Error('Missing credentials');
          }
          
          const userCredential = await signInWithEmailAndPassword(
            auth, 
            (credentials as any).email || '', 
            (credentials as any).password || ''
          );
          
          if (userCredential.user) {
            return {
              id: userCredential.user.uid,
              email: userCredential.user.email,
              name: userCredential.user.displayName,
            };
          }
          return null;
        } catch (error) {
          console.error('NextAuth authorize error:', error);
          if (error instanceof Error) {
            throw new Error(error.message);
          }
          throw new Error('An unexpected error occurred');
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt', // Use 'jwt' strategy
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async session({ session, token }: { session: Session, token: any }) {
      // Add custom session handling logic if needed
      if (token?.user) {
        session.user = token.user;
      }
      return session;
    },
    async jwt({ token, user }: { token: any, user: any }) {
      // Add custom JWT handling logic if needed
      if (user) {
        token.user = user;
      }
      return token;
    },
  },
}
