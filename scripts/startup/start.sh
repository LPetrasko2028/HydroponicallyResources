sudo pm2 delete HydroponicallyResourcesMain || true
sudo pm2 save
# Start new instance
sudo pm2 start HydroponicallyResourcesMain.js
# Save PM2 configuration
sudo pm2 save