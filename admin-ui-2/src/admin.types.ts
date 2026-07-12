// Shapes mirror the real admin API payloads (admin/src/stages/admin-*.ts) so this
// experiment could be wired to GET /api/v1/admin/* without reshaping.

export interface RegUser {
  id: string;
  name: string;
  email: string;
  role: "member" | "manager" | "admin";
  company: string;
  runsThisWeek: number;
  runsLastWeek: number;
  lastActiveAt: string | number | null;
  deactivated?: boolean;
}

export interface GuestRun {
  id: string;
  persona: string;
  meetingType: string;
  stars: number | null;
  createdAt: string | number;
}

export interface FeedbackItem {
  id: string;
  from: string;
  stars: number;
  comment: string;
  createdAt: string | number;
}

export interface ErrorItem {
  id: string;
  message: string;
  where: string;
  count: number;
  lastSeenAt: string | number;
  resolved: boolean;
}

export interface AdminData {
  users: RegUser[];
  guestRuns: GuestRun[];
  feedback: FeedbackItem[];
  errors: ErrorItem[];
}
