# Google Cloud Storage (GCS)

## Credentials 

There are two methods for setting GCS credentials:
1. Through the Project => Cloud Storage settings in the Label Studio user interface.
2. Through Google Application Default Credentials (ADC). This involves the following steps:

   2.1. Leave the Google Application Credentials field in the Label Studio UI blank.
   
   2.2. Set an environment variable which will apply to all Cloud Storages. This can be done using the following command:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=google_credentials.json
   ```
   2.3. Alternatively, use the following command:
   ```bash
   gcloud auth application-default login
   ```
   2.4. Another option is to use credentials provided by the Google App Engine or Google Compute Engine metadata server, if the code is running on either GAE or GCE.

Note: If Cloud Storage credentials are set in the Label Studio UI, these will take precedence over other methods.