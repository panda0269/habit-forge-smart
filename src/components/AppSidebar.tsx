import { useState, useEffect } from 'react';
import { Home, BarChart3, FileText, Trophy, Settings, Sparkles, LogOut, CalendarCheck, Activity, Medal, UserCog } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth, User } from '@/hooks/useAuth';
import { useRewards } from '@/hooks/useRewards';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Fitness', url: '/fitness', icon: Activity },
  { title: 'Weekly Review', url: '/weekly-review', icon: CalendarCheck },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Reports', url: '/reports', icon: FileText },
  { title: 'Leaderboard', url: '/leaderboard', icon: Medal },
  { title: 'Rewards', url: '/rewards', icon: Trophy },
];

function UserProfileSection({ user, rewards }: { user: User | null; rewards: { xp_points: number; level: number } | null }) {
  if (!user) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50 mb-3">
      <Avatar className="h-10 w-10 border-2 border-primary/20">
        <AvatarImage src={getAvatarUrl(user.avatarUrl)} />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {user.displayName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {user.displayName || user.email.split('@')[0]}
        </p>
        {rewards && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-accent" />
            <span>Level {rewards.level}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{rewards.xp_points} XP</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { rewards } = useRewards();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              HabitForge
            </h1>
            <p className="text-xs text-muted-foreground">Smart Habit Tracker</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/settings">
                    <UserCog className="w-4 h-4" />
                    <span>Account Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Theme
                  </span>
                  <ThemeToggle />
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <UserProfileSection user={user} rewards={rewards} />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
