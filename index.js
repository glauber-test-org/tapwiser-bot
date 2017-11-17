module.exports = (robot) => {

  console.log('Robot is ready.')

  const postComment = async (context, message) => {
    const params = context.issue({ body: message });
    await context.github.issues.createComment(params);
  };

  const addLabel = async (context, label) => {
    return await context.github.issues.addLabels({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.number,
      labels: [label]
    });
  };

  const createStatus = async (context, state, description) => {
    return await context.github.repos.createStatus({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      sha: context.payload.pull_request.head.sha,
      state: state,
      description: description,
      context: "TapWiser Bot"
    });
  };

  const isPullRequestApproved = async (context) => {

    const reviews = await context.github.pullRequests.getReviews({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.pull_request.number,
    }).data;

    let reviewStatus = {};
    for (var i = 0; i < reviews.length; i++) {
      let review = reviews[i];
      reviewStatus[review.user.login] = review.state;
    }

    // number of approvals from the OTHER users
    const numberOfApprovals = Object.values(reviewStatus).filter(function (s) { return s === "approved" || s === "APPROVED"; }).length;

    const config = await context.config('config.yml');

    const isApproved = numberOfApprovals >= config.minimumApprovalCount;

    return await isApproved;
  }

  const autoFillAssignee = async (context, config) => {
    if (context.payload.pull_request.assignee === null) {
      // await postComment(config.assigneeIsNullWarningMessage);
      await context.github.issues.addAssigneesToIssue({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        number: context.payload.number,
        assignees: [context.payload.pull_request.user.login]
      });
    }
  };

  const xcdataRequiresNoApproval = async (context, config) => {
    if (context.payload.pull_request.head.ref === "feature/xcdatamodel"
      && context.payload.pull_request.base.ref === "develop") {
      await postComment(config.xcdatamodelRequiresNoApprovalMessage);
      await addLabel(context, "review:not-required");
    }
  };

  async function onPullRequestOpened(context) {

    // const user = context.payload.pull_request.user.login;

    let config = await context.config('config.yml');

    console.log('aqui ' + JSON.stringify(config));

    await postComment(context, config.newPullRequestWelcomeComment);

    autoFillAssignee(context, config);

    xcdataRequiresNoApproval(context, config);
  }

  async function onPullRequestClosed(context) {
    const isMerged = context.payload.pull_request.merged && context.payload.pull_request.merged === true;

    if (isMerged === true) {
      const config = await context.config('config.yml');
      postComment(context, config.pullRequestMergedMessage);
    }
  }


  const onPullRequestUpdate = async context => {
    const config = await context.config('config.yml');

    let state = "error";
    let description = config.insufficientApprovalsMessage;

    const isApproved = await isPullRequestApproved(context);
    if (isApproved === true) {
      state = "success";
      description = config.approvedMessage;
    }

    await createStatus(context, state, description);



    // let labelsToSet = ["review:pending"];


    // let state = context.payload.review.state;

    // let reviews = await context.github.pullRequests.getReviews({
    //   owner: context.payload.repository.owner.login,
    //   repo: context.payload.repository.name,
    //   number: context.payload.pull_request.number,
    // });

    // reviews = reviews.data;

    // let numberOfApprovals = 0;

    // // console.log("aqui "+ JSON.stringify(reviews[0]));

    // // console.log("reviews = " + reviews.length);

    // let reviewStatus = {};
    // for (var i = 0; i < reviews.length; i++) {
    //   let review = reviews[i];
    //   reviewStatus[review.user.login] = review.state;
    // }

    // // console.log("aqui=" + JSON.stringify(reviewStatus));

    // // number of approvals from the OTHER users
    // numberOfApprovals = Object.values(reviewStatus).filter(function (s) { return s === "approved" || s === "APPROVED"; }).length;
    // numberOfApprovals = Object.values(reviewStatus).filter(s => s.toLowerCase === "approved").length;
    // {
    //   "aforner": "CHANGES_REQUESTED",
    //   "rfrealdo-ciandt": "APPROVED"
    // }

    // await context.github.issues.removeAllLabels({
    //   owner: context.payload.repository.owner.login,
    //   repo: context.payload.repository.name,
    //   number: context.payload.pull_request.number
    // });

    // let stateToSet = "error";
    // let descriptionToSet = `At least ${REVIEWER_COUNT} reviewers must approve this pull request.`;
    // let labelsToSet = ["review:pending"];

    // if (numberOfApprovals >= REVIEWER_COUNT) {
    //   stateToSet = "success";
    //   descriptionToSet = "We are all set!"
    //   labelsToSet = ["review:done"];
    // }

    // console.log("aqui " + numberOfApprovals);
    // console.log(JSON.stringify(reviewStatus));

    // await context.github.issues.addLabels({
    //   owner: context.payload.repository.owner.login,
    //   repo: context.payload.repository.name,
    //   number: context.payload.pull_request.number,
    //   labels: labelsToSet
    // });

    // await context.github.repos.createStatus({
    //   owner: context.payload.repository.owner.login,
    //   repo: context.payload.repository.name,
    //   sha: context.payload.pull_request.head.sha,
    //   state: stateToSet,
    //   description: descriptionToSet,
    //   context: "TapWiser Bot"
    // });



    // state = approved
    // state = changes_requested

  };



  robot.on('pull_request.opened', onPullRequestOpened);
  robot.on('pull_request.closed', onPullRequestClosed);
  robot.on(['pull_request.synchronize', 'pull_request_review.submitted'], onPullRequestUpdate);

}
