/** Types pour Supabase - Twitch Overlap V2.0 */

export type Database = {
  public: {
    Tables: {
      rosters: {
        Row: {
          id: number
          name: string
          description: string | null
          created_at: number
          updated_at: number
        }
        Insert: {
          name: string
          description?: string
        }
        Update: {
          name?: string
          description?: string | null
        }
      }
      roster_streamers: {
        Row: {
          roster_id: number
          c: string
          added_at: number
        }
        Insert: {
          roster_id: number
          c: string
        }
        Update: {
          roster_id?: number
          c?: string
        }
      }
      channels: {
        Row: {
          id: string
          name: string
          login: string
          display_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          login: string
          display_name: string
        }
        Update: {
          name?: string
          login?: string
          display_name?: string
        }
      }
      daily_overlap_matrix: {
        Row: {
          a: string
          b: string
          a_only: number
          b_only: number
          shared_viewers: number
          date: string
          created_at: string
        }
        Insert: {
          a: string
          b: string
          a_only: number
          b_only: number
          shared_viewers: number
          date: string
        }
        Update: {
          a_only?: number
          b_only?: number
          shared_viewers?: number
        }
      }
      messages: {
        Row: {
          id: string
          channel: string
          viewer_hash: string
          message_type: string
          created_at: string
        }
        Insert: {
          id: string
          channel: string
          viewer_hash: string
          message_type: string
        }
        Update: {
          channel?: string
          message_type?: string
        }
      }
      viewers: {
        Row: {
          hash: string
          first_seen: string
          last_seen: string
          message_count: number
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}