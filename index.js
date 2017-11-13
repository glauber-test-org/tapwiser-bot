module.exports = (robot) => {
  // Your code here
  console.log('Yay, the app was loaded!')

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/

  // synchronize

  robot.on('pull_request.opened', async context => {

    const params = context.issue({ body: 'Hello @' + context.payload.pull_request.user.login + '! I am your friendly review bot!' });
    await context.github.issues.createComment(params);

    await context.github.issues.removeAllLabels({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.number
    });

    let stateToSet = "error";
    let descriptionToSet = "At least 2 reviewers must approve this pull request.";
    let labelsToSet = ["review:pending"];


    if (context.payload.pull_request.head.ref === "feature/xcdatamodel" && context.payload.pull_request.base.ref === "develop") {

      stateToSet = "success";
      descriptionToSet = "We are all set!"
      labelsToSet = ["review:not-required"];

      await context.github.issues.addLabels({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        number: context.payload.number,
        labels: labelsToSet
      });

    }


    await context.github.repos.createStatus({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      sha: context.payload.pull_request.head.sha,
      state: stateToSet,
      description: descriptionToSet,
      context: "TapWiser Bot"
    });

  });

  robot.on('pull_request_review.submitted', async context => {

    // let state = context.payload.review.state;

    let reviews = await context.github.pullRequests.getReviews({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.pull_request.number,
    });

    let numberOfApprovals = 0;

    for (var i = 0; i < review.length; i++) {

      let review = reviews[i];

      console.log('=======');
      console.log(review);

      // number of approvals from the OTHER users
      if (review.state === "APPROVED" && review.user.long !== context.payload.pull_request.user.login) {
        numberOfApprovals++;
      }

    }

    await context.github.issues.removeAllLabels({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.number
    });

    let stateToSet = "error";
    let descriptionToSet = "At least 2 reviewers must approve this pull request.";
    let labelsToSet = ["review:pending"];

    if (numberOfApprovals >= 2) {
      stateToSet = "success";
      descriptionToSet = "We are all set!"
      labelsToSet = ["review:done"];
    }

    await context.github.issues.addLabels({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.number,
      labels: labelsToSet
    });

    await context.github.repos.createStatus({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      sha: context.payload.pull_request.head.sha,
      state: stateToSet,
      description: descriptionToSet,
      context: "TapWiser Bot"
    });



    // state = approved
    // state = changes_requested


  });

  robot.on('pull_request.closed', async context => {

    const isMerged = context.payload.pull_request.merged && context.payload.pull_request.merged === true;

    if (isMerged) {

      const message = 'Hey @' + context.payload.pull_request.user.login + '👋\n\n' +
        'Thank you for your contribution and congrats on getting this pull request merged 🎉\n\n' +
        'The code change now lives in the ' + context.payload.pull_request.base.ref + ' branch.';

      const params = context.issue({ body: message });

      return context.github.issues.createComment(params);

    }

  });


}
