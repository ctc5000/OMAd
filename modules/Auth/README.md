# Order Master® Auth Module

## Overview
This module provides authentication and authorization services for the Order Master® Ads Analytics platform.

## Features
- JWT-based authentication
- Role-based access control
- Advertiser data isolation
- Secure password hashing

## Roles
- `ADMIN`: Full system access
- `AD_MANAGER`: Comprehensive analytics access
- `ADVERTISER`: Limited to own advertiser's data

## Authentication Flow
1. User logs in with email and password
2. Server validates credentials
3. JWT token is generated with user details
4. Token used for subsequent authenticated requests

## Security Principles
- Passwords are hashed using bcrypt
- JWT tokens expire after 24 hours
- Role-based access control prevents unauthorized data access

## Dependencies
- bcrypt
- jsonwebtoken
- sequelize

## Setup
1. Set `JWT_SECRET` environment variable
2. Run migrations
3. Create initial users/advertisers


