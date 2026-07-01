output "mesh_node_id" {
  description = "Cloudflare Mesh node / WARP Connector tunnel ID."
  value       = cloudflare_zero_trust_tunnel_warp_connector.mesh_node.id
}

output "mesh_node_name" {
  description = "Cloudflare Mesh node name."
  value       = cloudflare_zero_trust_tunnel_warp_connector.mesh_node.name
}

output "warp_team_name" {
  description = "Team name to enter in the Cloudflare One Client on macOS and Android."
  value       = var.team_name
}

output "linux_mesh_node_install_script" {
  description = "Run this script on the Linux machine that should become the Mesh node. Sensitive because it contains the connector token."
  value = templatefile("${path.module}/scripts/install-linux-mesh-node.sh.tftpl", {
    connector_token = data.cloudflare_zero_trust_tunnel_warp_connector_token.mesh_node.token
  })
  sensitive = true
}

output "linux_mesh_node_install_command" {
  description = "Command to print the sensitive install script after terraform apply."
  value       = "terraform output -raw linux_mesh_node_install_script > /tmp/install-cloudflare-mesh-node.sh && chmod +x /tmp/install-cloudflare-mesh-node.sh && sudo /tmp/install-cloudflare-mesh-node.sh"
}

output "advertised_routes" {
  description = "CIDR routes advertised behind the Linux Mesh node."
  value = {
    for key, route in cloudflare_zero_trust_tunnel_cloudflared_route.advertised : key => {
      id      = route.id
      network = route.network
      comment = route.comment
    }
  }
}
