import { authWithHeaders } from '../../middlewares/api-v3/auth';
import * as Tasks from '../../models/task';
import { NotFound } from '../../libs/api-v3/errors';
import Q from 'q';

let api = {};

/**
 * @api {post} /tasks Create a new task
 * @apiVersion 3.0.0
 * @apiName CreateTask
 * @apiGroup Task
 *
 * @apiSuccess {Object} task The newly created task
 */
api.createTask = {
  method: 'POST',
  url: '/tasks',
  middlewares: [authWithHeaders()],
  handler (req, res, next) {
    req.checkBody('type', res.t('invalidTaskType')).notEmpty().isIn(['habit', 'daily', 'todo', 'reward']);

    let user = res.locals.user;
    let taskType = req.body.type;

    let newTask = new Tasks[`${taskType.charAt(0).toUpperCase() + taskType.slice(1)}Model`](Tasks.Task.sanitize(req.body));
    newTask.userId = user._id;

    user.tasksOrder[taskType].unshift(newTask._id);

    Q.all([
      newTask.save(),
      user.save(),
    ])
      .then(([task]) => res.respond(201, task))
      .catch(next);
  },
};

/**
 * @api {get} /tasks Get an user's tasks
 * @apiVersion 3.0.0
 * @apiName GetTasks
 * @apiGroup Task
 *
 * @apiParam {string="habit","daily","todo","reward"} type Optional queyr parameter to return just a type of tasks
 *
 * @apiSuccess {Array} tasks An array of task objects
 */
api.getTasks = {
  method: 'GET',
  url: '/tasks',
  middlewares: [authWithHeaders()],
  handler (req, res, next) {
    req.checkQuery('type', res.t('invalidTaskType')).isIn(['habit', 'daily', 'todo', 'reward']);

    let user = res.locals.user;
    let query = {userId: user._id};
    let type = req.query.type;
    if (type) query.type = type.charAt(0).toUpperCase() + type.slice(1); // task.ype is stored with firt uppercase letter

    Tasks.TaskModel.find(query).exec()
      .then((tasks) => res.respond(200, tasks))
      .catch(next);
  },
};

/**
 * @api {get} /task/:taskId Get a task given its id
 * @apiVersion 3.0.0
 * @apiName GetTask
 * @apiGroup Task
 *
 * @apiParam {UUID} taskId The task _id
 *
 * @apiSuccess {object} task The task object
 */
api.getTask = {
  method: 'GET',
  url: '/tasks/:taskId',
  middlewares: [authWithHeaders()],
  handler (req, res, next) {
    let user = res.locals.user;

    req.checkParams('taskId', res.t('taskIdRequired')).notEmpty().isUUID();

    Tasks.TaskModel.findOne({
      _id: req.params.taskId,
      userId: user._id,
    }).exec()
    .then((task) => {
      if (!task) throw new NotFound(res.t('taskNotFound'));
      res.respond(200, task);
    })
    .catch(next);
  },
};
// api.updateTask
// api.deleteTask
// api.score
// api.scoreChecklist

export default api;
