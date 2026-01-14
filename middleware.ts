import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/upload/:path*",
    "/edit/:path*",
    "/preview/:path*",
  ],
};

