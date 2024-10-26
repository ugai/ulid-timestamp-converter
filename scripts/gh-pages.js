var ghpages = require('gh-pages');

ghpages.publish(
    'dist',
    {
        branch: 'gh-pages',
        silent: true,
        repo: 'https://' + process.env.GITHUB_TOKEN + '@github.com/ugai/ulid-timestamp-converter.git',
        user: {
            name: 'ugai',
            email: 'ugai.sub1@gmail.com'
        }
    },
    () => {
        console.log('Deploy Complete!')
    }
)