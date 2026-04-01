#!/bin/bash
 
PROJECT_ID="gwx-internship-01"
REGION="us-east1"
SERVICE_NAME="payu-frontend"
GAR_REPO="us-east1-docker.pkg.dev/$PROJECT_ID/gwx-gar-intern-01"
IMAGE="$GAR_REPO/payu-frontend:latest"
VITE_API_URL="https://payu-main-service-717740758627.us-east1.run.app"

SHARED_ENV="VITE_API_URL=$VITE_API_URL"
 
echo "Building Backend..."
docker build  -t $IMAGE .
docker push $IMAGE
 
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image=$IMAGE \
  --region=$REGION \
  --allow-unauthenticated \
  --project=$PROJECT_ID \
  --platform=managed \
  --port=8080 \
  --max-instances=2 \
  --min-instances=0 \
  --min=0 \
  --max=2 \
  --set-env-vars="$SHARED_ENV" \
  --service-account gwx-cloudrun-sa-01@gwx-internship-01.iam.gserviceaccount.com \