
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "attempts": {
                  Row: {
                    "answer": Json | null,"concept_id": string,"confidence": number | null,"declared_help": boolean,"echo_id": string | null,"family_id": string,"forecast": number | null,"id": string,"instance_id": string,"item_id": string,"item_rating": number | null,"kind": string,"misconception_id": string | null,"outcome": string | null,"presented_at": string,"rated": boolean,"rating_delta": number | null,"repair_step": number,"resolved_at": string | null,"revealed_at": string | null,"set_id": string | null,"slot": number | null,"state": string,"track_id": string,"user_id": string
                  }
                  Insert: {
                    "answer"?: Json | null,"concept_id": string,"confidence"?: number | null,"declared_help"?: boolean,"echo_id"?: string | null,"family_id": string,"forecast"?: number | null,"id"?: string,"instance_id": string,"item_id": string,"item_rating"?: number | null,"kind": string,"misconception_id"?: string | null,"outcome"?: string | null,"presented_at"?: string,"rated": boolean,"rating_delta"?: number | null,"repair_step"?: number,"resolved_at"?: string | null,"revealed_at"?: string | null,"set_id"?: string | null,"slot"?: number | null,"state"?: string,"track_id": string,"user_id": string
                  }
                  Update: {
                    "answer"?: Json | null,"concept_id"?: string,"confidence"?: number | null,"declared_help"?: boolean,"echo_id"?: string | null,"family_id"?: string,"forecast"?: number | null,"id"?: string,"instance_id"?: string,"item_id"?: string,"item_rating"?: number | null,"kind"?: string,"misconception_id"?: string | null,"outcome"?: string | null,"presented_at"?: string,"rated"?: boolean,"rating_delta"?: number | null,"repair_step"?: number,"resolved_at"?: string | null,"revealed_at"?: string | null,"set_id"?: string | null,"slot"?: number | null,"state"?: string,"track_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attempts_echo_fk"
      columns: ["echo_id"]
isOneToOne: false
      referencedRelation: "echoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attempts_instance_id_fkey"
      columns: ["instance_id"]
isOneToOne: false
      referencedRelation: "instances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attempts_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attempts_set_id_fkey"
      columns: ["set_id"]
isOneToOne: false
      referencedRelation: "sets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attempts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"code_submissions": {
                  Row: {
                    "attempt_id": string,"compile_output": string | null,"confidence": number | null,"created_at": string,"failed_group": number | null,"finished_at": string | null,"id": string,"judge_tokens": (string)[],"language": string,"rated": boolean,"source": string,"status": string,"user_id": string,"verdict": string | null
                  }
                  Insert: {
                    "attempt_id": string,"compile_output"?: string | null,"confidence"?: number | null,"created_at"?: string,"failed_group"?: number | null,"finished_at"?: string | null,"id"?: string,"judge_tokens"?: (string)[],"language": string,"rated": boolean,"source": string,"status"?: string,"user_id": string,"verdict"?: string | null
                  }
                  Update: {
                    "attempt_id"?: string,"compile_output"?: string | null,"confidence"?: number | null,"created_at"?: string,"failed_group"?: number | null,"finished_at"?: string | null,"id"?: string,"judge_tokens"?: (string)[],"language"?: string,"rated"?: boolean,"source"?: string,"status"?: string,"user_id"?: string,"verdict"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "code_submissions_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "code_submissions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"code_tests": {
                  Row: {
                    "expected": string,"fingerprint": string,"group_idx": number,"input": string,"item_id": string,"label": string
                  }
                  Insert: {
                    "expected": string,"fingerprint": string,"group_idx": number,"input": string,"item_id": string,"label": string
                  }
                  Update: {
                    "expected"?: string,"fingerprint"?: string,"group_idx"?: number,"input"?: string,"item_id"?: string,"label"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "code_tests_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"concept_cards": {
                  Row: {
                    "body": NonNullable<Json>,"concept_id": string,"reviewed_at": string,"reviewer": string,"version": number
                  }
                  Insert: {
                    "body": NonNullable<Json>,"concept_id": string,"reviewed_at": string,"reviewer": string,"version": number
                  }
                  Update: {
                    "body"?: NonNullable<Json>,"concept_id"?: string,"reviewed_at"?: string,"reviewer"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "concept_cards_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: true
      referencedRelation: "concepts"
      referencedColumns: ["id"]
    }
                  ]
                },"concept_ratings": {
                  Row: {
                    "concept_id": string,"echo_successes": number,"first_correct_at": string | null,"last_at": string | null,"last_echo_success_at": string | null,"n": number,"rating": number,"rd": number,"state": string,"user_id": string
                  }
                  Insert: {
                    "concept_id": string,"echo_successes"?: number,"first_correct_at"?: string | null,"last_at"?: string | null,"last_echo_success_at"?: string | null,"n"?: number,"rating": number,"rd": number,"state"?: string,"user_id": string
                  }
                  Update: {
                    "concept_id"?: string,"echo_successes"?: number,"first_correct_at"?: string | null,"last_at"?: string | null,"last_echo_success_at"?: string | null,"n"?: number,"rating"?: number,"rd"?: number,"state"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "concept_ratings_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "concepts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "concept_ratings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"concepts": {
                  Row: {
                    "entry_rating": number,"id": string,"name": string,"prereqs": (string)[],"sort": number,"summary": string,"track_id": string
                  }
                  Insert: {
                    "entry_rating": number,"id": string,"name": string,"prereqs"?: (string)[],"sort": number,"summary": string,"track_id": string
                  }
                  Update: {
                    "entry_rating"?: number,"id"?: string,"name"?: string,"prereqs"?: (string)[],"sort"?: number,"summary"?: string,"track_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "concepts_track_id_fkey"
      columns: ["track_id"]
isOneToOne: false
      referencedRelation: "tracks"
      referencedColumns: ["id"]
    }
                  ]
                },"daily": {
                  Row: {
                    "day": string,"instance_id": string,"item_id": string,"number": number
                  }
                  Insert: {
                    "day": string,"instance_id": string,"item_id": string,"number": number
                  }
                  Update: {
                    "day"?: string,"instance_id"?: string,"item_id"?: string,"number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "daily_instance_id_fkey"
      columns: ["instance_id"]
isOneToOne: false
      referencedRelation: "instances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "daily_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"echoes": {
                  Row: {
                    "concept_id": string,"done_attempt_id": string | null,"due_at": string,"family_id": string,"id": string,"interval_days": number,"source_attempt_id": string,"status": string,"track_id": string,"user_id": string
                  }
                  Insert: {
                    "concept_id": string,"done_attempt_id"?: string | null,"due_at": string,"family_id": string,"id"?: string,"interval_days": number,"source_attempt_id": string,"status"?: string,"track_id": string,"user_id": string
                  }
                  Update: {
                    "concept_id"?: string,"done_attempt_id"?: string | null,"due_at"?: string,"family_id"?: string,"id"?: string,"interval_days"?: number,"source_attempt_id"?: string,"status"?: string,"track_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "echoes_done_attempt_id_fkey"
      columns: ["done_attempt_id"]
isOneToOne: false
      referencedRelation: "attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "echoes_source_attempt_id_fkey"
      columns: ["source_attempt_id"]
isOneToOne: false
      referencedRelation: "attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "echoes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"families": {
                  Row: {
                    "concept_id": string,"id": string
                  }
                  Insert: {
                    "concept_id": string,"id": string
                  }
                  Update: {
                    "concept_id"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "families_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "concepts"
      referencedColumns: ["id"]
    }
                  ]
                },"instance_secrets": {
                  Row: {
                    "answer": NonNullable<Json>,"instance_id": string,"misconceptions": NonNullable<Json>,"solution": NonNullable<Json>,"steps": NonNullable<Json>
                  }
                  Insert: {
                    "answer": NonNullable<Json>,"instance_id": string,"misconceptions": NonNullable<Json>,"solution": NonNullable<Json>,"steps": NonNullable<Json>
                  }
                  Update: {
                    "answer"?: NonNullable<Json>,"instance_id"?: string,"misconceptions"?: NonNullable<Json>,"solution"?: NonNullable<Json>,"steps"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "instance_secrets_instance_id_fkey"
      columns: ["instance_id"]
isOneToOne: true
      referencedRelation: "instances"
      referencedColumns: ["id"]
    }
                  ]
                },"instances": {
                  Row: {
                    "answer_spec": NonNullable<Json>,"created_at": string,"id": string,"item_id": string,"prompt": NonNullable<Json>,"seed": number,"skin": string | null
                  }
                  Insert: {
                    "answer_spec": NonNullable<Json>,"created_at"?: string,"id"?: string,"item_id": string,"prompt": NonNullable<Json>,"seed": number,"skin"?: string | null
                  }
                  Update: {
                    "answer_spec"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"item_id"?: string,"prompt"?: NonNullable<Json>,"seed"?: number,"skin"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "instances_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"integrity_flags": {
                  Row: {
                    "created_at": string,"detail": NonNullable<Json>,"id": string,"kind": string,"resolution": string | null,"resolved_at": string | null,"track_id": string | null,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"detail": NonNullable<Json>,"id"?: string,"kind": string,"resolution"?: string | null,"resolved_at"?: string | null,"track_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"detail"?: NonNullable<Json>,"id"?: string,"kind"?: string,"resolution"?: string | null,"resolved_at"?: string | null,"track_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "integrity_flags_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"items": {
                  Row: {
                    "anchor": boolean,"concept_id": string,"daily_eligible": boolean,"family_id": string,"id": string,"kind": string,"level": number,"n": number,"rating": number,"rd": number,"source_id": string,"source_version": number,"status": string,"track_id": string,"updated_at": string
                  }
                  Insert: {
                    "anchor"?: boolean,"concept_id": string,"daily_eligible"?: boolean,"family_id": string,"id": string,"kind": string,"level": number,"n"?: number,"rating": number,"rd": number,"source_id": string,"source_version": number,"status": string,"track_id": string,"updated_at"?: string
                  }
                  Update: {
                    "anchor"?: boolean,"concept_id"?: string,"daily_eligible"?: boolean,"family_id"?: string,"id"?: string,"kind"?: string,"level"?: number,"n"?: number,"rating"?: number,"rd"?: number,"source_id"?: string,"source_version"?: number,"status"?: string,"track_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "concepts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "items_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "items_track_id_fkey"
      columns: ["track_id"]
isOneToOne: false
      referencedRelation: "tracks"
      referencedColumns: ["id"]
    }
                  ]
                },"misconception_stats": {
                  Row: {
                    "concept_id": string,"last_at": string,"misconception_id": string,"user_id": string,"weight": number
                  }
                  Insert: {
                    "concept_id": string,"last_at": string,"misconception_id": string,"user_id": string,"weight": number
                  }
                  Update: {
                    "concept_id"?: string,"last_at"?: string,"misconception_id"?: string,"user_id"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "misconception_stats_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "concepts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "misconception_stats_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"moderation_actions": {
                  Row: {
                    "action": string,"admin_id": string,"created_at": string,"id": string,"params": NonNullable<Json>,"reason": string,"user_id": string
                  }
                  Insert: {
                    "action": string,"admin_id": string,"created_at"?: string,"id"?: string,"params"?: NonNullable<Json>,"reason": string,"user_id": string
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string,"created_at"?: string,"id"?: string,"params"?: NonNullable<Json>,"reason"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"playbook": {
                  Row: {
                    "attempt_id": string,"concept_id": string,"created_at": string,"id": string,"text": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "attempt_id": string,"concept_id": string,"created_at"?: string,"id"?: string,"text": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "attempt_id"?: string,"concept_id"?: string,"created_at"?: string,"id"?: string,"text"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "playbook_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: true
      referencedRelation: "attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "playbook_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "concepts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "playbook_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "age_confirmed_at": string,"banned_at": string | null,"created_at": string,"handle": string,"handle_changed_at": string | null,"id": string,"intensity": string,"leaderboard_visible": boolean,"pledge_accepted_at": string,"rating_reveal": string,"reduced_motion": boolean,"set_size": number,"terms_accepted_at": string,"theme": string,"tracks": (string)[],"weekly_goal": number
                  }
                  Insert: {
                    "age_confirmed_at": string,"banned_at"?: string | null,"created_at"?: string,"handle": string,"handle_changed_at"?: string | null,"id": string,"intensity"?: string,"leaderboard_visible": boolean,"pledge_accepted_at": string,"rating_reveal"?: string,"reduced_motion"?: boolean,"set_size"?: number,"terms_accepted_at": string,"theme"?: string,"tracks"?: (string)[],"weekly_goal"?: number
                  }
                  Update: {
                    "age_confirmed_at"?: string,"banned_at"?: string | null,"created_at"?: string,"handle"?: string,"handle_changed_at"?: string | null,"id"?: string,"intensity"?: string,"leaderboard_visible"?: boolean,"pledge_accepted_at"?: string,"rating_reveal"?: string,"reduced_motion"?: boolean,"set_size"?: number,"terms_accepted_at"?: string,"theme"?: string,"tracks"?: (string)[],"weekly_goal"?: number
                  }
                  Relationships: [

                  ]
                },"rate_events": {
                  Row: {
                    "created_at": string,"kind": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"kind": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"kind"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rate_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rating_events": {
                  Row: {
                    "attempt_id": string,"created_at": string,"expected": number,"id": number,"model_version": string,"r_after": number,"r_before": number,"rd_after": number,"rd_before": number,"score": number,"subject_id": string,"subject_type": string,"user_id": string
                  }
                  Insert: {
                    "attempt_id": string,"created_at"?: string,"expected": number,"id"?: never,"model_version": string,"r_after": number,"r_before": number,"rd_after": number,"rd_before": number,"score": number,"subject_id": string,"subject_type": string,"user_id": string
                  }
                  Update: {
                    "attempt_id"?: string,"created_at"?: string,"expected"?: number,"id"?: never,"model_version"?: string,"r_after"?: number,"r_before"?: number,"rd_after"?: number,"rd_before"?: number,"score"?: number,"subject_id"?: string,"subject_type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rating_events_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rating_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"id": string,"reason": string,"reporter_id": string | null,"resolution": string | null,"resolved_at": string | null,"target_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"reason": string,"reporter_id"?: string | null,"resolution"?: string | null,"resolved_at"?: string | null,"target_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"reason"?: string,"reporter_id"?: string | null,"resolution"?: string | null,"resolved_at"?: string | null,"target_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"sets": {
                  Row: {
                    "close_reason": string | null,"closed_at": string | null,"created_at": string,"id": string,"mode": string,"rng_seed": number,"size": number,"track_id": string,"user_id": string
                  }
                  Insert: {
                    "close_reason"?: string | null,"closed_at"?: string | null,"created_at"?: string,"id"?: string,"mode": string,"rng_seed": number,"size": number,"track_id": string,"user_id": string
                  }
                  Update: {
                    "close_reason"?: string | null,"closed_at"?: string | null,"created_at"?: string,"id"?: string,"mode"?: string,"rng_seed"?: number,"size"?: number,"track_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sets_track_id_fkey"
      columns: ["track_id"]
isOneToOne: false
      referencedRelation: "tracks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sets_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"track_ratings": {
                  Row: {
                    "last_at": string | null,"n": number,"peak": number,"rating": number,"rd": number,"track_id": string,"user_id": string
                  }
                  Insert: {
                    "last_at"?: string | null,"n"?: number,"peak": number,"rating": number,"rd": number,"track_id": string,"user_id": string
                  }
                  Update: {
                    "last_at"?: string | null,"n"?: number,"peak"?: number,"rating"?: number,"rd"?: number,"track_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "track_ratings_track_id_fkey"
      columns: ["track_id"]
isOneToOne: false
      referencedRelation: "tracks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "track_ratings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tracks": {
                  Row: {
                    "id": string,"name": string,"sort": number
                  }
                  Insert: {
                    "id": string,"name": string,"sort": number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"sort"?: number
                  }
                  Relationships: [

                  ]
                },"transitions": {
                  Row: {
                    "attempt_id": string | null,"created_at": string,"id": string,"kind": string,"response": NonNullable<Json>,"user_id": string
                  }
                  Insert: {
                    "attempt_id"?: string | null,"created_at"?: string,"id": string,"kind": string,"response": NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "attempt_id"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"response"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transitions_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transitions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "leaderboard": {
                  Row: {
                    "handle": string | null,"n": number | null,"rank": number | null,"rating": number | null,"track_id": string | null
                  }
                  Relationships: [

                  ]
                }
          }
          Functions: {
            "close_stale_sets":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"public_profile":
{ Args: { "p_handle": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"public": {
          Enums: {

          }
        }
} as const
