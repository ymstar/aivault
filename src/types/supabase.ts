export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string
          name: string | null
          plan: Database['public']['Enums']['Plan']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_id: string
          email: string
          name?: string | null
          plan?: Database['public']['Enums']['Plan']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string
          name?: string | null
          plan?: Database['public']['Enums']['Plan']
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_connections: {
        Row: {
          id: string
          user_id: string
          platform: Database['public']['Enums']['Platform']
          access_token: string | null
          status: Database['public']['Enums']['ConnectionStatus']
          last_synced_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: Database['public']['Enums']['Platform']
          access_token?: string | null
          status?: Database['public']['Enums']['ConnectionStatus']
          last_synced_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: Database['public']['Enums']['Platform']
          access_token?: string | null
          status?: Database['public']['Enums']['ConnectionStatus']
          last_synced_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'platform_connections_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          platform: Database['public']['Enums']['Platform']
          title: string
          summary: string | null
          tags: string[]
          message_count: number
          created_at: string
          imported_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: Database['public']['Enums']['Platform']
          title: string
          summary?: string | null
          tags?: string[]
          message_count?: number
          created_at: string
          imported_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: Database['public']['Enums']['Platform']
          title?: string
          summary?: string | null
          tags?: string[]
          message_count?: number
          created_at?: string
          imported_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          created_at: string
          token_count: number | null
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          created_at: string
          token_count?: number | null
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string
          created_at?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: string
          plan: Database['public']['Enums']['Plan']
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          plan?: Database['public']['Enums']['Plan']
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          plan?: Database['public']['Enums']['Plan']
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      embeddings: {
        Row: {
          id: string
          message_id: string | null
          conversation_id: string | null
          user_id: string
          content: string
          embedding: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id?: string | null
          conversation_id?: string | null
          user_id: string
          content: string
          embedding?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string | null
          conversation_id?: string | null
          user_id?: string
          content?: string
          embedding?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'embeddings_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'embeddings_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          key_hash: string
          key_prefix: string
          name: string
          last_used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          key_hash: string
          key_prefix: string
          name?: string
          last_used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          key_hash?: string
          key_prefix?: string
          name?: string
          last_used_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'api_keys_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      match_embeddings: {
        Args: {
          query_embedding: string
          match_user_id: string
          match_count?: number
        }
        Returns: {
          id: string
          message_id: string
          conversation_id: string
          content: string
          similarity: number
        }[]
      }
    }
    Enums: {
      Plan: 'FREE' | 'STARTER' | 'PRO' | 'TEAM'
      Platform: 'CHATGPT' | 'CLAUDE' | 'GEMINI' | 'OTHER'
      ConnectionStatus: 'ACTIVE' | 'DISCONNECTED' | 'ERROR'
      SubscriptionStatus: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'INCOMPLETE' | 'TRIALING' | 'UNPAID'
    }
  }
}
