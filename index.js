module.exports = (robot) => {
  // Your code here
  console.log('Yay, the app was loaded!')

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/

  // synchronize

  const REVIEWER_COUNT = 1;

  robot.on('pull_request.opened', async context => {

    const user = context.payload.pull_request.user.login;
    // const reviewerCount = 1;
    const message =
      `Hello @${user}! I'm your friendly review bot.
    
    To get this PR merged you'll need the approval of ${REVIEWER_COUNT} reviewers at least.
    
    Our Code Review Rules just in case:
    https://docs.google.com/spreadsheets/d/1mZCNhit1fXvsXw4mOJS1CgONT78sVB8-5VswbgaEZq8`;

    // const message = Hello @' + context.payload.pull_request.user.login + '! I am your friendly review bot!'
    const params = context.issue({ body: message });

    await context.github.issues.createComment(params);

    await context.github.issues.removeAllLabels({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.number
    });

    let stateToSet = "error";
    let descriptionToSet = `At least ${REVIEWER_COUNT} reviewers must approve this pull request.`;
    let labelsToSet = ["review:pending"];


    if (context.payload.pull_request.head.ref === "feature/xcdatamodel" && context.payload.pull_request.base.ref === "develop") {

      const message = "The branch feature/xcdatamodel requires no review at all. Go! Go! Go!";
      const params = context.issue({ body: message });
      await context.github.issues.createComment(params);


      stateToSet = "success";
      descriptionToSet = "We are all set!"
      labelsToSet = ["review:not-required"];

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

      return;

    }

    if (context.payload.pull_request.assignee === null) {

      const message = "Please assign someone to merge this PR, and optionally include people who should review.";
      const params = context.issue({ body: message });
      await context.github.issues.createComment(params);

      stateToSet = "pending";
      descriptionToSet = `At least ${REVIEWER_COUNT} reviewers must approve this pull request.`;

      await context.github.repos.createStatus({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        sha: context.payload.pull_request.head.sha,
        state: stateToSet,
        description: descriptionToSet,
        context: "TapWiser Bot"
      });

      return;

    }







  });

  robot.on('pull_request_review.submitted', async context => {

    // let state = context.payload.review.state;

    if (context.payload.review.user.login === context.payload.pull_request.user.login) {

      if (context.payload.review.state !== "comment") {

        // Shame! Shame!
        const message = ":bell: Shame! :bell: Shame!\nYou cannot vote to approve your own PR. 'A' for effort though.";
        const params = context.issue({ body: message });
        await context.github.issues.createComment(params);

      }

      return;
    }

    let reviews = await context.github.pullRequests.getReviews({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.pull_request.number,
    });

    reviews = reviews.data;

    let numberOfApprovals = 0;

    // console.log("aqui "+ JSON.stringify(reviews[0]));

    // console.log("reviews = " + reviews.length);

    let reviewStatus = {};
    for (var i = 0; i < reviews.length; i++) {
      let review = reviews[i];
      reviewStatus[review.user.login] = review.state;
    }

    // console.log("aqui=" + JSON.stringify(reviewStatus));

    // number of approvals from the OTHER users
    numberOfApprovals = Object.values(reviewStatus).filter(function (s) { return s === "approved" || s === "APPROVED"; }).length;
    // numberOfApprovals = Object.values(reviewStatus).filter(s => s.toLowerCase === "approved").length;
    // {
    //   "aforner": "CHANGES_REQUESTED",
    //   "rfrealdo-ciandt": "APPROVED"
    // }

    await context.github.issues.removeAllLabels({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.pull_request.number
    });

    let stateToSet = "error";
    let descriptionToSet = `At least ${REVIEWER_COUNT} reviewers must approve this pull request.`;
    let labelsToSet = ["review:pending"];

    if (numberOfApprovals >= REVIEWER_COUNT) {
      stateToSet = "success";
      descriptionToSet = "We are all set!"
      labelsToSet = ["review:done"];
    }

    console.log("aqui " + numberOfApprovals);
    console.log(JSON.stringify(reviewStatus));

    await context.github.issues.addLabels({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.pull_request.number,
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

      return await context.github.issues.createComment(params);

    }

  });


}
