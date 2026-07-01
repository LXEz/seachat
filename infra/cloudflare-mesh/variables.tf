variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the Zero Trust organization."
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token. Prefer setting CLOUDFLARE_API_TOKEN instead of this variable."
  type        = string
  sensitive   = true
  default     = null
}

variable "team_name" {
  description = "Cloudflare Zero Trust team name. This is the value entered in the Cloudflare One Client."
  type        = string
}

variable "allowed_email_domain" {
  description = "Email domain allowed to enroll Mac/Android devices into WARP, for example @example.com. Leave empty to rely on allowed_emails."
  type        = string
  default     = ""
}

variable "allowed_emails" {
  description = "Specific email addresses allowed to enroll devices into WARP."
  type        = list(string)
  default     = []

  validation {
    condition     = var.allowed_email_domain != "" || length(var.allowed_emails) > 0
    error_message = "Set allowed_email_domain or at least one allowed_emails entry."
  }
}

variable "allowed_idp_ids" {
  description = "Optional Access identity provider IDs allowed for WARP enrollment. Empty means use the account default login methods."
  type        = list(string)
  default     = []
}

variable "auto_redirect_to_identity" {
  description = "When true and allowed_idp_ids contains one IdP, Cloudflare redirects directly to that IdP during enrollment."
  type        = bool
  default     = false
}

variable "mesh_node_name" {
  description = "Name for this Linux machine's Cloudflare Mesh node / WARP Connector."
  type        = string
  default     = "workspace-linux"
}

variable "advertised_routes" {
  description = "Optional LAN CIDR routes behind this machine. Empty means Mac/Android can reach only this machine's Mesh IP, not the whole LAN."
  type = list(object({
    network = string
    comment = optional(string)
  }))
  default = []
}

variable "virtual_network_id" {
  description = "Optional Cloudflare Zero Trust virtual network ID for advertised_routes."
  type        = string
  default     = null
}

variable "manage_default_device_profile" {
  description = "Set true only if you want Terraform to manage the account default WARP device profile. This can overwrite existing dashboard settings."
  type        = bool
  default     = false
}

variable "device_profile_include_routes" {
  description = "Split Tunnel include-mode routes for the default WARP device profile when manage_default_device_profile is true."
  type = list(object({
    address     = string
    description = optional(string)
  }))
  default = [
    {
      address     = "100.96.0.0/12"
      description = "Cloudflare Mesh IP range"
    }
  ]
}

variable "device_profile_allow_updates" {
  description = "Allow Cloudflare One Client update notifications when managing the default device profile."
  type        = bool
  default     = true
}

variable "device_profile_allowed_to_leave" {
  description = "Allow users to leave the Zero Trust organization from the client when managing the default device profile."
  type        = bool
  default     = true
}
