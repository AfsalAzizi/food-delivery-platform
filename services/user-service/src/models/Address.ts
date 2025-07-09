export interface Address {
  id: string;
  user_id: string;
  label: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}
