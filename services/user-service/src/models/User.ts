export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: string;
  created_at: Date;
  updated_at: Date;
}
