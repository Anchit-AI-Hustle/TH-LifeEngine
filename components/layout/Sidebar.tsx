"use client";
import { useEffect, useState } from "react";
import NavLink from "./NavLink";
import LogoutButton from "@/components/LogoutButton";

const NAV:[string,string][]= [
  ["/lifeengine","Home"],
  ["/lifeengine/profiles","Profiles"],
  ["/lifeengine/create","Create Plan - Gemini"],
  ["/use-custom-gpt","Create Plan - Custom GPT"],
  ["/lifeengine/dashboard","Dashboard"],
  ["/lifeengine/fitness","Fitness & Health"],
  ["/lifeengine/fitness/planner","Activity Plan"],
  ["/lifeengine/fitness/tracker","Activity Tracker"],
  ["/lifeengine/fitness/activities","Activity Library"],
  ["/lifeengine/settings","Settings"]
];

export default function Sidebar() {
  const [rootUser, setRootUser] = useState<any>(null);

  useEffect(() => {
    // Initialize root user on mount - RUNS ONLY ONCE
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('th_lifeengine_root_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          // Only update lastLogin, don't write back to localStorage to avoid loops
          user.lastLogin = new Date().toISOString();
          setRootUser(user);
        } catch (err) {
          console.error('Failed to parse user data:', err);
          // Create fresh user if data is corrupted
          const newUser = {
            id: `root_${Date.now()}`,
            username: 'root',
            email: 'root@thlifeengine.com',
            role: 'root',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          };
          localStorage.setItem('th_lifeengine_root_user', JSON.stringify(newUser));
          setRootUser(newUser);
        }
      } else {
        // Create root user only if doesn't exist
        const newUser = {
          id: `root_${Date.now()}`,
          username: 'root',
          email: 'root@thlifeengine.com',
          role: 'root',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        localStorage.setItem('th_lifeengine_root_user', JSON.stringify(newUser));
        setRootUser(newUser);
      }
    }
  }, []); // Empty dependency array - runs only once on mount

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ padding: "0 12px", fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>
        Navigation
      </div>
      <nav aria-label="Main" style={{ flex: 1 }}>
        {NAV.map(([h, l]) => <NavLink key={h} href={h} label={l} />)}
      </nav>
      
      {/* Root User Display */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB',
        fontSize: '12px',
        color: '#6B7280',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px', fontSize: '13px' }}>
          👤 {rootUser?.username || 'Loading...'}
        </div>
        <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
          {rootUser?.email}
        </div>
        <div style={{ fontSize: '10px', color: '#16A34A', marginTop: '4px', fontWeight: '600' }}>
          {rootUser?.role?.toUpperCase()}
        </div>
        {rootUser?.lastLogin && (
          <div style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '4px' }}>
            Last login: {new Date(rootUser.lastLogin).toLocaleTimeString()}
          </div>
        )}
        <div style={{ marginTop: '8px' }}>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
