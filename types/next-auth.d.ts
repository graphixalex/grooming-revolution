import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: "OWNER" | "MANAGER" | "STAFF";
      salonId: string;
      canAccessGroupSalons: boolean;
    };
  }

  interface User {
    role: "OWNER" | "MANAGER" | "STAFF";
    salonId: string;
    canAccessGroupSalons: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "OWNER" | "MANAGER" | "STAFF";
    salonId?: string;
    canAccessGroupSalons?: boolean;
  }
}

