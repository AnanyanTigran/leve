import { S3Client, PutBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({ region: process.env.AWS_REGION })

await s3.send(new PutBucketLifecycleConfigurationCommand({
  Bucket: process.env.S3_BUCKET_NAME!,
  LifecycleConfiguration: {
    Rules: [
      {
        ID: 'delete-raw-uploads-48h',
        Status: 'Enabled',
        Filter: { Prefix: 'raw/' },
        Expiration: { Days: 2 },
      },
    ],
  },
}))

console.log('S3 lifecycle policy applied: raw/ prefix expires after 2 days')
