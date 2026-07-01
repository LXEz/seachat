locals {
  normalized_email_domain = (
    var.allowed_email_domain == ""
    ? ""
    : startswith(var.allowed_email_domain, "@")
      ? var.allowed_email_domain
      : "@${var.allowed_email_domain}"
  )

  enrollment_include = concat(
    local.normalized_email_domain == "" ? [] : [
      {
        email_domain = {
          domain = local.normalized_email_domain
        }
      }
    ],
    [
      for email in var.allowed_emails : {
        email = {
          email = email
        }
      }
    ]
  )

  device_profile_include = [
    for route in var.device_profile_include_routes : {
      address     = route.address
      description = try(route.description, null)
    }
  ]
}

resource "cloudflare_zero_trust_access_policy" "warp_enrollment" {
  account_id = var.cloudflare_account_id
  name       = "Allow WARP enrollment"
  decision   = "allow"

  include = local.enrollment_include
}

resource "cloudflare_zero_trust_access_application" "device_enrollment" {
  account_id                  = var.cloudflare_account_id
  type                        = "warp"
  name                        = "WARP device enrollment"
  domain                      = "${var.team_name}.cloudflareaccess.com/warp"
  allowed_idps                = length(var.allowed_idp_ids) > 0 ? var.allowed_idp_ids : null
  auto_redirect_to_identity   = var.auto_redirect_to_identity
  app_launcher_visible        = false

  policies = [
    {
      id         = cloudflare_zero_trust_access_policy.warp_enrollment.id
      precedence = 1
    }
  ]
}

resource "cloudflare_zero_trust_tunnel_warp_connector" "mesh_node" {
  account_id = var.cloudflare_account_id
  name       = var.mesh_node_name
}

data "cloudflare_zero_trust_tunnel_warp_connector_token" "mesh_node" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_warp_connector.mesh_node.id
}

resource "cloudflare_zero_trust_tunnel_cloudflared_route" "advertised" {
  for_each = {
    for route in var.advertised_routes : route.network => route
  }

  account_id         = var.cloudflare_account_id
  tunnel_id          = cloudflare_zero_trust_tunnel_warp_connector.mesh_node.id
  network            = each.value.network
  comment            = try(each.value.comment, "Routed through ${var.mesh_node_name}")
  virtual_network_id = var.virtual_network_id
}

resource "cloudflare_zero_trust_device_default_profile" "mesh" {
  count = var.manage_default_device_profile ? 1 : 0

  account_id         = var.cloudflare_account_id
  allow_mode_switch  = true
  allow_updates      = var.device_profile_allow_updates
  allowed_to_leave   = var.device_profile_allowed_to_leave
  service_mode_v2    = { mode = "warp" }
  include            = local.device_profile_include
}
