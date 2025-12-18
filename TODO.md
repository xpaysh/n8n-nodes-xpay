# n8n-nodes-xpay - TODO

## Status: Core Implementation Complete

## Setup & Build
- [ ] `npm install` - Install dependencies
- [ ] `npm run build` - Build the package
- [ ] `npm link` - Link for local n8n testing

## Local Testing with n8n
- [ ] Install n8n locally or use Docker
- [ ] Link package: `cd ~/.n8n && npm link n8n-nodes-xpay`
- [ ] Restart n8n and verify node appears
- [ ] Test workflow activation (webhook registration)
- [ ] Test webhook signature verification

## Integration Testing (requires backend)
- [ ] Deploy xpay-n8n-backend first
- [ ] Update API base URL in node if needed
- [ ] Test full flow: activate workflow → get checkout URL → payment → trigger

## Before Publishing to npm
- [ ] Test with real n8n instance
- [ ] Verify all node properties work correctly
- [ ] Test sandbox mode
- [ ] Update README with any changes
- [ ] Bump version in package.json
- [ ] `npm publish --access public`

## Future Enhancements
- [ ] Add more currency options (ETH, SOL)
- [ ] Add webhook retry configuration
- [ ] Add analytics/stats in node output
- [ ] Add support for recurring payments
- [ ] Submit to n8n community nodes directory

## Dependencies
- Requires: `xpay-n8n-backend` deployed for webhook registration
- Requires: `run-xpay` deployed for checkout pages
