# Assuming Root User

# Create a new user for deploying the code w/ limited permissions
sudo adduser deploy
sudo usermod -aG dialout sudo gpio spi i2c github-runner deploy
sudo apt update
sudo apt upgrade

# Config SSH for deploy user - Customer ???

# Harden SSH
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no
# PasswordAuthentication no
sudo systemctl restart ssh

# Firewall
sudo apt install ufw
sudo ufw allow ssh
sudo ufw allow OpenSSH
sudo ufw allow http
sudo ufw allow https
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

sudo ufw enable
sudo ufw status

# Install Docker Engine on Hydroponically Repo

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v

npm i -g pm2

# Set up GitHub Runner
