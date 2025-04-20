module.exports = {
    root: true,
    extends: ['universe', 'universe/native', 'prettier'],
    rules: {
        'import/order': 0,
        'react-native/no-inline-styles': 0,
        'import/namespace': 0,
        'no-duplicate-imports': 'error',
    },
    env: {
        jest: true,
    },
};
