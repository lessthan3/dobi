
module.exports = {
  extends: 'airbnb-base',
  overrides: [
    // JS files
    {
      files: [
        '**/*.js',
      ],
      parserOptions: {
        sourceType: 'script',
      },
    },
    // Jest tests
    {
      env: {
        jest: true,
      },
      files: [
        '**/*.test.{m,}js',
        '**/test.{m,}js',
        '**/test/**',
      ],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          { devDependencies: true },
        ],
        /*
          Prevent needlessly async tests.
        */
        'require-await': 'error',
      },
      // TODO: Is this good practice, or should we require each package to declare jest, etc. as
      //       dev deps? ¯\_(ツ)_/¯
      settings: {
        'import/core-modules': [
          'jest',
        ],
      },
    },
  ],
  rules: {
    /*
      This rule gets in the way when writing a module that will contain multiple exports in the
      future.
    */
    'import/prefer-default-export': 'off',
    /*
      Seriously?
    */
    'no-confusing-arrow': 'off',
    /*
      This is stupid.
    */
    'no-continue': 'off',
    /*
      Can you imagine if they had to call it "C+=1"?
    */
    'no-plusplus': 'off',
    /*
      Reading from process.env in Node is SLOW! It's fine to disable this rule for one-time setup
      operations. The rule is enabled so we don't foolishly attempt to read from process.env inside
      of a request handler.
    */
    'no-process-env': 'error',
    /*
      AirBnB disables generators and async/await because of the runtime cost when transpiled to ES5,
      but this isn't a concern when running JavaScript in Node instead of a browser.
    */
    'no-restricted-syntax': 'off',
    /*
      We use Mongo.
    */
    'no-underscore-dangle': ['error', { allow: ['_id', '_counter'] }],
    'sort-keys': 'error',
  },
};
