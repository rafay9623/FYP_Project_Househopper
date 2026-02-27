# Setting up Google Gemini AI

This project uses Google's Gemini models for AI features. Follow these steps to set up your API key.

## Prerequisites

- A Google Cloud Platform (GCP) project (optional, but recommended for production)
- Access to [Google AI Studio](https://aistudio.google.com/)

## Step 1: Get an API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click on the **Create API key** button.
3. Select an existing Google Cloud project or let it create a new one for you.
4. Copy the generated API key.

## Step 2: Configure the Backend

1. Navigate to the `backend` directory.
2. If you haven't already, copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and paste your API key:
   ```env
   GEMINI_API_KEY=your_copied_api_key_here
   ```

## Step 3: Verify Setup

To verify your key is working, you can run the test script in the backend directory:

```bash
cd backend
node test-key.js
```

If successful, you should see a response from the Gemini model.

## Troubleshooting

- **Quota Errors**: Ensure you have billing enabled if you exceed the free tier limits (though the free tier is generous).
- **Region Issues**: Gemini API is available in most regions, but check [available regions](https://ai.google.dev/available_regions) if you face issues.
