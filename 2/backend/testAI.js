// AI功能测试脚本
const modelService = require('./modelService');

async function testAI() {
    console.log('🤖 开始测试AI功能...\n');

    // 测试1: 生成背景问题
    console.log('1️⃣ 测试生成背景问题:');
    try {
        const backgroundQuestion = await modelService.generateBackgroundQuestion('人工智能在教育领域的应用前景');
        console.log('✅ 背景问题:', backgroundQuestion);
    } catch (error) {
        console.log('❌ 背景问题生成失败:', error.message);
    }

    console.log('\n');

    // 测试2: 评估回答深度
    console.log('2️⃣ 测试评估回答深度:');
    try {
        const depth = await modelService.evaluateResponse(
            '你认为AI在教育中的最大优势是什么？',
            '我觉得AI可以个性化学习，根据每个学生的情况提供不同的教学内容和节奏。'
        );
        console.log('✅ 回答深度评估:', depth);
    } catch (error) {
        console.log('❌ 回答深度评估失败:', error.message);
    }

    console.log('\n');

    // 测试3: 生成深入问题
    console.log('3️⃣ 测试生成深入问题:');
    try {
        const deeperQuestion = await modelService.generateDeeperQuestion(
            '你认为AI在教育中的最大优势是什么？',
            '我觉得AI可以个性化学习。'
        );
        console.log('✅ 深入问题:', deeperQuestion);
    } catch (error) {
        console.log('❌ 深入问题生成失败:', error.message);
    }

    console.log('\n🎉 AI功能测试完成!');
}

// 如果直接运行此脚本
if (require.main === module) {
    testAI().catch(console.error);
}

module.exports = testAI; 