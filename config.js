export const CLOUDINARY_CONFIG = {
    cloudName : 'dddpqvxzg',
    uploadPreset: 'locdfd'
};

export const SUPABASE_URL = 'https://xyatgkreuaoouejjyzrj.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5YXRna3JldWFvb3Vlamp5enJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTMwMjAsImV4cCI6MjA3NTcyOTAyMH0.P5qTKVjwfaujfpoO0t1j3T5VDYpMwEuhFQhaQyjv5FY';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
