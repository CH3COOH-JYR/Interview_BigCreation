import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/Home.vue'
import CreateTopicView from '../views/CreateTopic.vue'
import InterviewView from '../views/Interview.vue'
import SummaryView from '../views/Summary.vue'
import TopicsListView from '../views/TopicsList.vue'
import InterviewsListView from '../views/InterviewsList.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/create-topic',
    name: 'createTopic',
    component: CreateTopicView
  },
  {
    path: '/interview/:id',
    name: 'interview',
    component: InterviewView,
    props: true
  },
  {
    path: '/summary/:interviewId',
    name: 'summary',
    component: SummaryView,
    props: true
  },
  {
    path: '/topics',
    name: 'topicsList',
    component: TopicsListView
  },
  {
    path: '/interviews',
    name: 'interviewsList',
    component: InterviewsListView
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
