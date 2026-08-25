const Minio = require('minio');

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
    secretKey: process.env.MINIO_SECRET_KEY || 'password123',
});

const initializeMinio = async () => {
    const bucketName = process.env.MINIO_BUCKET_NAME || 'icuman';
    
    try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
            console.log(`🪣 Created MinIO bucket: ${bucketName}`);
            
            // Set bucket policy to allow public read access
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: ['s3:GetObject'],
                        Effect: 'Allow',
                        Principal: '*',
                        Resource: [`arn:aws:s3:::${bucketName}/*`]
                    }
                ]
            };
            await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
            console.log(`🔓 Set public read policy for bucket: ${bucketName}`);
        }
        console.log('✅ MinIO connected and bucket ready');
    } catch (err) {
        console.error('❌ MinIO Error:', err);
    }
};

module.exports = {
    minioClient,
    initializeMinio
};
