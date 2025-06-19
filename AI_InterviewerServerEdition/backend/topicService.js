const Topic = require('./Topic');
const Interview = require('./Interview');
const Summary = require('./Summary');

// 获取所有访谈主题
exports.getAllTopics = async () => {
  return await Topic.find().sort({ createdAt: -1 });
};

// 创建新访谈主题
exports.createTopic = async (topicData) => {
  const newTopic = new Topic(topicData);
  return await newTopic.save();
};

// 获取特定访谈主题
exports.getTopicById = async (id) => {
  return await Topic.findById(id);
};

// 更新访谈主题
exports.updateTopic = async (id, topicData) => {
  return await Topic.findByIdAndUpdate(
    id,
    topicData,
    { new: true, runValidators: true }
  );
};

// 删除访谈主题
exports.deleteTopic = async (id) => {
  try {
    // 首先获取该主题下的所有访谈
    const interviews = await Interview.find({ topicId: id });
    const interviewIds = interviews.map(interview => interview._id);

    // 删除相关的总结
    if (interviewIds.length > 0) {
      console.log(`删除主题 ${id} 相关的 ${interviewIds.length} 个访谈的总结`);
      await Summary.deleteMany({ interviewId: { $in: interviewIds } });
    }

    // 删除相关的访谈
    console.log(`删除主题 ${id} 的 ${interviews.length} 个访谈`);
    await Interview.deleteMany({ topicId: id });

    // 最后删除主题本身
    const deletedTopic = await Topic.findByIdAndDelete(id);

    console.log(`主题 ${id} 及其相关数据删除完成`);
    return deletedTopic;
  } catch (error) {
    console.error(`删除主题 ${id} 时发生错误:`, error);
    throw error;
  }
};
