"use client";

import React, { createContext, useContext } from "react";
import { authClient } from "./client";

type UseSessionReturn = ReturnType<typeof authClient.useSession>;

const UserContext = createContext<UseSessionReturn | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const session = authClient.useSession();

    return (
        <UserContext.Provider value={session}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}
