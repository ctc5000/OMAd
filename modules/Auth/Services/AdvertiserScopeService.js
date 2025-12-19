class AdvertiserScopeService {
    static getAdvertiserScope(user) {
        if (!user) {
            throw new Error('User not provided');
        }

        switch (user.role) {
            case 'ADMIN':
            case 'AD_MANAGER':
                return {}; // Full access
            case 'ADVERTISER':
                if (!user.advertiserId) {
                    throw new Error('Advertiser ID not found for ADVERTISER role');
                }
                return { advertiser_id: user.advertiserId };
            default:
                throw new Error('Invalid user role');
        }
    }
}

module.exports = AdvertiserScopeService;


