terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.19"
    }
  }
}

provider "cloudflare" {
  # Prefer CLOUDFLARE_API_TOKEN in the environment.
  api_token = var.cloudflare_api_token
}
