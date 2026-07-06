export interface Profile {
  id: number;
  name: string;
  image: string | null;
  email: string;
  age: number;
  genderId: number;
  isWalkIn: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  image?: string | null;
  age?: number;
  genderId?: number;
}
