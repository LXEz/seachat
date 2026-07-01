# Cloudflare Mesh Terraform

This directory manages the Cloudflare Zero Trust pieces needed for this Linux machine, a Mac, and an Android device to communicate over Cloudflare Mesh.

What Terraform creates:

- A WARP device enrollment Access policy.
- A WARP device enrollment application.
- One Cloudflare Mesh node / WARP Connector for this Linux machine.
- Optional CIDR routes behind this Linux machine.
- Optional default WARP device profile management for Mesh split tunnel routes.

What Terraform does not do:

- It does not enroll your Mac or Android automatically. Install the Cloudflare One Client and enter `team_name`.
- It does not commit API tokens, connector tokens, Terraform state, or local credentials.
- It does not modify the default WARP device profile unless `manage_default_device_profile = true`.

## Required Cloudflare permissions

Create a scoped Cloudflare API token with the minimum account permissions needed for this directory:

- `Access: Apps and Policies Write`
- `Cloudflare One Connector: WARP Write`
- `Cloudflare One Networks Write`
- `Zero Trust Write` if you set `manage_default_device_profile = true`

Set the token locally:

```bash
export CLOUDFLARE_API_TOKEN="..."
```

## Configure

```bash
cd infra/cloudflare-mesh
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

- `cloudflare_account_id`: your Cloudflare account ID.
- `team_name`: your Zero Trust team name, the value entered in the Cloudflare One Client.
- `allowed_email_domain` or `allowed_emails`: who can enroll Mac/Android devices.
- `mesh_node_name`: name for this Linux machine.
- `advertised_routes`: leave empty unless this machine should route a LAN subnet.

## Apply

```bash
terraform init
terraform plan
terraform apply
```

This workspace does not have Terraform installed, so validation must run on your machine or CI.

## Enroll this Linux machine as the Mesh node

After `terraform apply`, print and run the generated install script:

```bash
terraform output -raw linux_mesh_node_install_script > /tmp/install-cloudflare-mesh-node.sh
chmod +x /tmp/install-cloudflare-mesh-node.sh
sudo /tmp/install-cloudflare-mesh-node.sh
```

The output is marked sensitive because it contains the WARP Connector token.

## Enroll Mac

1. Install the Cloudflare One Client.
2. Choose Zero Trust security.
3. Enter `team_name`.
4. Authenticate with an allowed email or IdP.
5. Confirm the client is connected.

## Enroll Android

1. Install the Cloudflare One Agent app.
2. Enter `team_name`.
3. Authenticate with an allowed email or IdP.
4. Install the VPN profile and connect.

## Test

From Mac or Android, find the Linux Mesh node IP in Cloudflare Dashboard > Networking > Mesh, then:

```bash
ping <linux-mesh-ip>
ssh <user>@<linux-mesh-ip>
```

If you add `advertised_routes`, your LAN router also needs a return route:

- Destination: `100.96.0.0/12`
- Next hop: this Linux machine's LAN IP

Without that return route, devices behind the Linux node may receive packets but cannot reply to Mac/Android Mesh IPs.
