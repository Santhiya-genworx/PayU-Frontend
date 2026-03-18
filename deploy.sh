#!/bin/bash
 
PROJECT_ID="gwx-internship-01"
REGION="us-east1"
SERVICE_NAME="payu-frontend"
GAR_REPO="us-east1-docker.pkg.dev/$PROJECT_ID/gwx-gar-intern-01"
IMAGE="$GAR_REPO/payu-frontend:latest"
 
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
  --service-account gwx-cloudrun-sa-01@gwx-internship-01.iam.gserviceaccount.com \