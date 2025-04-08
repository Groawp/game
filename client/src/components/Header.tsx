import React from 'react';
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { getUser, isAdmin, removeUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const user = getUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    removeUser();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/shuttlecock.png" alt="Badminton Shuttlecock" className="h-8 w-8" />
          <Link href="/">
            <span className="text-lg font-bold cursor-pointer">Badminton Sign Up</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden md:inline">Hello, {user.name}</span>
              {isAdmin() && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    Admin Dashboard
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Link href="/">
              <Button variant="outline" size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}