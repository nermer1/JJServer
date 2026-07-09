import mongoose from 'mongoose';
import {schemas} from './src/schemas/schemaMap.js';
import {basicProperty} from './src/properties/ServerProperty.js';
import SystemSettingsCacheService from './src/service/SystemSettingsCacheService.js';

async function test() {
    console.log('Connecting to DB...', basicProperty.db.host);
    
    // Connect to DB (assuming no user/pass needed for local testing, or basicProperty contains credentials)
    const uri = basicProperty.db.user && basicProperty.db.password 
        ? `mongodb://${basicProperty.db.user}:${basicProperty.db.password}@${basicProperty.db.host}`
        : `mongodb://${basicProperty.db.host}`;
        
    await mongoose.connect(uri);
    
    console.log('Loading cache...');
    await SystemSettingsCacheService.loadSettings();
    
    console.log('OUTLINE_BASE_URL:', SystemSettingsCacheService.get('OUTLINE_BASE_URL'));
    console.log('OUTLINE_WIKI_TOKEN:', SystemSettingsCacheService.get('OUTLINE_WIKI_TOKEN'));
    
    process.exit(0);
}

test().catch(console.error);
