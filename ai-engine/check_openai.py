#!/usr/bin/env python
"""Check OpenAI API configuration"""
import openai
import os

print('🔑 CHECKING OPENAI API CONFIGURATION')
print('='*50)

# Check if API key is set
api_key = os.getenv('OPENAI_API_KEY')
if api_key:
    print('✅ OPENAI_API_KEY environment variable found')
    masked_key = api_key[:8] + '...' + api_key[-4:] if len(api_key) > 12 else '***'
    print(f'   Key: {masked_key}')
else:
    print('❌ OPENAI_API_KEY environment variable not found')
    print()
    print('📝 TO SET UP:')
    print('   1. Get API key from: https://platform.openai.com/api-keys')
    print('   2. Set environment variable:')
    print('      PowerShell: $env:OPENAI_API_KEY="your-api-key-here"')
    print('      Command Prompt: set OPENAI_API_KEY=your-api-key-here')
    print('   3. Or use: openai api configure --api-key YOUR_KEY')
    print()
    print('💰 COST ESTIMATE:')
    print('   Training: ~$3-5 (469 samples, 3 epochs)')
    print('   Usage: $0.003/1K input, $0.009/1K output tokens')

try:
    print()
    print('🔗 TESTING API CONNECTION...')
    client = openai.OpenAI()
    models = client.models.list()
    print('✅ API connection successful!')
    print(f'   Available models: {len(models.data)} models')

    print()
    print('🎯 READY FOR FINE-TUNING!')
    print('='*50)
    print()
    print('📋 NEXT STEPS:')
    print('1. Ensure API key is set (see above)')
    print('2. Run the fine-tuning command below')
    print('3. Monitor training progress')
    print('4. Test the fine-tuned model')

except Exception as e:
    print(f'❌ API connection failed: {str(e)[:100]}...')
    print('   (This is expected if no API key is set)')
    print()
    print('🔧 TROUBLESHOOTING:')
    print('1. Check API key is valid and has credits')
    print('2. Verify internet connection')
    print('3. Check OpenAI service status at: https://status.openai.com')