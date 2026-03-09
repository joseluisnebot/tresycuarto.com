#!/bin/bash
# Distribuye la clave SSH de la VM tresycuarto-dev a Proxmox y todos los CTs/VMs
# Ejecutar desde la Shell del Proxmox (192.168.1.111:8006)

PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINaC9+L9cuAHvieIVcyIG6NC9voojIR2btuTAPwyWWeL ubuntu@tresycuarto-dev"

echo "=== Añadiendo clave SSH de tresycuarto-dev ==="

# 1. Proxmox host
mkdir -p /root/.ssh
grep -qF "$PUBKEY" /root/.ssh/authorized_keys 2>/dev/null || echo "$PUBKEY" >> /root/.ssh/authorized_keys
chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys
echo "✓ Proxmox host"

# 2. Todos los CTs LXC en ejecucion
for CT in $(pct list | awk 'NR>1 && $2=="running" {print $1}'); do
  NAME=$(pct list | awk -v id="$CT" '$1==id {print $3}')
  pct exec $CT -- bash -c "mkdir -p /root/.ssh && grep -qF '${PUBKEY}' /root/.ssh/authorized_keys 2>/dev/null || echo '${PUBKEY}' >> /root/.ssh/authorized_keys && chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✓ CT $CT ($NAME)"
  else
    echo "✗ CT $CT ($NAME) — no se pudo (puede necesitar que este corriendo)"
  fi
done

# 3. Todas las VMs (qemu) en ejecucion via qemu-guest-agent
for VM in $(qm list | awk 'NR>1 && $3=="running" {print $1}'); do
  NAME=$(qm list | awk -v id="$VM" '$1==id {print $2}')
  qm guest exec $VM -- bash -c "mkdir -p /root/.ssh && grep -qF '${PUBKEY}' /root/.ssh/authorized_keys 2>/dev/null || echo '${PUBKEY}' >> /root/.ssh/authorized_keys && chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✓ VM $VM ($NAME)"
  else
    echo "  VM $VM ($NAME) — sin guest-agent o no accesible (normal)"
  fi
done

echo ""
echo "=== Listo. Prueba desde tresycuarto-dev: ==="
echo "  ssh root@192.168.1.111   (Proxmox)"
echo "  ssh root@192.168.1.152   (CT Listmonk)"
