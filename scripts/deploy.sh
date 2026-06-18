#!/bin/bash

npm run build

if [ $? -ne 0 ]; then
echo "Build failed. Deployment cancelled."
exit 1
fi

git add .
git commit -m "FanAtlas update"
git push origin main
