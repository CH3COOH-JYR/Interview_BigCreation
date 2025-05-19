const Topic = require('../models/Topic');

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
  return await Topic.findByIdAndDelete(id);
};
