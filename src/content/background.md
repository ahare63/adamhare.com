---
title: "Background"
description: "Adam Hare's work experience at Zoomi, Air Force Institute of Technology, and LexisNexis, and his education at the University of Oxford and Princeton."
---

## Work Experience

### [Zoomi](https://zoomi.ai/), Inc (December 2019 to Present)

![Zoomi logo](/images/about/895188f16de5d6a0d9255d9236796354.jpg)

Head of AI; previously Lead AI Engineer and Data Scientist, Advanced Research

Philadelphia, Pennsylvania (remote, from New York City)

**At a Glance**

- **Core Technologies:** Hands-on: Python, JavaScript, SQL (Postgres), React. Through coding agents: C#/.NET, TypeScript, AWS serverless (Lambda, SQS, RDS)
- **Role Summary:** Head of AI at a research-driven AI learning platform. I own the AI and product roadmap, the major client relationships, and delivery, and I still work hands-on in design and code.

- **Overall Impact:** I manage an offshore contract engineering team (five people, now two) and kept delivery on pace as it shrank by taking on product management, QA, and data science myself through coding agents. Specific work includes:

**Product & Leadership**

- Own the AI and product roadmap: gather client requirements, set technical direction, and manage delivery
- Design product flows and interfaces in Figma, by hand and with Claude, and write the specs the team builds from

- Lead Zoomi’s major client relationships and demos across executive coaching, general education, and federal training
- Moved the team to agentic development with Claude Code, including automatic documentation and a daily digest of Jira, repository, and AWS activity

- Replaced manual QA with agents that hold every non-admin role: they verify ticket fixes, reproduce reported bugs, run regression across SCORM content, and post video recordings of their runs
- Hired and managed three interns

**LLM & Agentic Systems**

- Launched a two-agent conversational assistant, in production with about 5,000 learners: a platform guide for navigation and FAQs, and an in-context tutor that answers questions about on-screen content using the learner’s analytics
- Grounded both agents with retrieval over a vector store, live learning data, and proprietary clickstream motifs

- Taking an agentic report builder to production: a tool-calling agent writes SQL over curated read-only views in a sandboxed database role, and the server renders charts from the real query results
- Designed its evaluation gate: a hand-verified question set in multiple phrasings, requiring 95% accuracy and identical answers across runs. It caught a production model fabricating a chart.

- Shipped LLM pipelines that automatically summarize and title learning content across the platform

**Research & Engineering**

- Designed content recommendations (topic vectors, nearest-neighbor search), helped turn behavioral motifs into real-time recommendations, and built the learner-ability model
- Run a multi-tenant SaaS platform on AWS serverless (.NET, React, Postgres), directing coding agents across the stack

- Published topic-modeling research in ACM TIST and a first-author NLP preprint on arXiv (see Papers & Presentations)
- **Skills Gained:** Owning a product end to end, from client requirements to delivery; building and evaluating LLM agents; managing a small remote team; directing coding agents across a production stack

- **The Team:** An offshore contract engineering team, Zoomi’s leadership, and client stakeholders; earlier, other software engineers, data scientists, and the sales and QA teams

### Air Force Institute of Technology (Summer 2018)

![Air Force Institute of Technology crest](/images/about/a8c984f54b8495802ffbe67bbfc8b2b9.jpg)

Software Engineering Intern

Wright-Patterson Air Force Base, Dayton, Ohio

**At a Glance**

- **Core Technologies:** Rust, Cargo, C
- **Project Summary:** Wrote embedded software for satellite platform designed for a variety of payloads

- **Overall Impact:** Led a team writing API and service for the radio system, contributed to HDLC Crate
- **Skills Gained:** Embedded systems programming, working collaboratively, introduction to SCRUM and other workflow practices

- **The Team:** Worked with other software engineers, electrical engineers, mechanical engineers

**In Depth**

I chose this internship largely to broaden my technical skill set. Most of my work previously had been high-level whereas all of the work for this internship was for embedded systems. I was also very interested in the goal of the project. Previously satellites designed by this program had been built from the ground up each time to serve a specific payload. This project aimed to create a general purpose satellite framework that could be updated as necessary and could support many different kinds of payloads. Accomplishing this would not only greatly reduce the work and expense that would go in to building each satellite, but would also dramatically reduce the amount of time required to launch a satellite. Finally, I liked that this project was a research one that gave me the opportunity to interact with students. AFIT is a Master's level program for aerospace engineers, and the satellites built for this project are to support a class in satellite design. Each is eventually launched to do scientific research, but throughout the process helps to train aerospace engineers.

The first two weeks were dedicated to learning the language Rust and its project management system Cargo. After this, I began right away on a project to integrate the radio with existing flight software. This consisted of writing an API and service, both in Rust, that would allow the onboard computer to send messages to and receive messages from the radio. Often this boiled down to determining how to handle bits transmitted to and from the radio. The project was complicated by the fact that the radio was no longer being supported by its manufacturer and had incomplete documentation. In addition to software testing, it was often necessary to test directly with the hardware by setting up a software defined radio, simulating the output from the onboard computer, and seeing how the radio responded to its input. After we got the radio to successfully downlink, I moved on to working on a service for the payload for the last week of my internship.

Overall, I learned a lot from my time at AFIT. I gained knowledge of embedded systems and gained first-hand experience in working with them and programming in Rust. I was able to help with teaching, which is always a valuable skill in reinforcing one's own knowledge. I also became more familiar with working as part of a team. In my undergraduate degree, collaboration was generally discouraged on most projects and my previous internship was based on a project I did on my own. At AFIT, I frequently pair programmed or helped to debug someone else's code. I contributed to an open source Rust crate [HDLC](https://github.com/CLomanno/hdlc) written primarily by one of my coworkers. I also gained experience reading other people's code and ensuring I wrote readable code myself. I started to use standard tools, such as GitLab, Trello, and Slack for workflow management. Lastly, I was introduced to the SCRUM framework.

### LexisNexis Special Services Inc. (Summer 2016)

![LexisNexis logo](/images/about/9a146282cbb3cfcf0c7272b2819600cd.jpg)

Software Engineering Intern

Dayton, Ohio

**At a Glance**

- **Core Technologies:** Enterprise Control Language (ECL), High Performance Cluster Computing (HPCC)
- **Project Summary:** Completed a project to provide a measure of accuracy on record matches

- **Overall Impact:** Feature added directly to customer-facing web application
- **Skills Gained:** Experience with the Extract, Transform, and Load (ETL) model, using cluster computing with millions of records

- **The Team:** Worked mostly alone with supervision from a mentor

**In Depth**

I chose this internship to learn what data processing looks like in practice and gain experience with cluster computing. The first few weeks of the internship were centered around learning Enterprise Control Language (ECL) on data from IMDb. These wound up being several tables of a few million rows each. ECL is somewhat similar to Hadoop and uses much the same syntax as SQL. I learned about how to extract, transform, and load (ETL) data. The exercises taught me how to think critically about the data received as input and all of the inconsistencies it might have. Some of the assignments required designing algorithms to return information about the movie (such as the top-billed actor). Often, I strove to make a simple and naïve algorithm that was efficient and a more elaborate one that was more accurate. This exercise helped me to consider problems in several different ways and design solutions that were best suited to a customer's needs.

After I finished learning ECL, I began work on an algorithm to determine how well records were matched. One of LNSSI's major web applications attempts to match heterogeneous data on certain fields and return a combined record. These matches were often "fuzzy," in that some fields had to be guessed at or slight discrepancies ignored due to inaccurately input data. My task was to consider the major fields used by LNSSI's customers and provide a confidence score for how well the records were matched. This required considering the relative importance for different fields and how much variance should be accepted for each. The idea was that this could then be evaluated by humans to improve record matching for their specific dataset. I worked on this project alone with supervision from a full-time software engineer. At the end of the project, I was told that my confidence score was being added to the primary customer-facing web application provided by the company.

## Education

### University of Oxford (October 2018-September 2019)

![University of Oxford crest](/images/about/61f3ac071f1e19753867591a3491e238.jpg)

Oxford, England

**At a Glance**

- **College:** Trinity College
- **Major:** Computer Science

- **Concentration:** Machine Learning and Artificial Intelligence
- **Degree Type:** Master of Science (MSc)

- **Degree Class:** Distinction (highest possible honors)
- **Award Date:** 4 October 2019

- **Graduation Date:** 18 January 2020

![Blazon of Trinity College, Oxford](/images/about/0db5b2cc86dcd7e773986c8f9d0e63c3.jpg)

**Dissertation**

For more on the dissertation, see [Projects](/projects).

I knew that I wanted my dissertation to focus on a project that incorporated AI and ML but also had a positive impact on average people. After doing some research on explainable AI, I came to this project (called Mockingbird). The abstract is as follows:

> "As algorithms are increasingly used to make potentially life-altering decisions the importance of ensuring they meet certain standards of fairness, accountability, and transparency is becoming paramount. Complex models that are poorly understood are susceptible to bias, relying on protected or irrelevant features, and adversarial examples. This concern has spawned interest in explainable and interpretable algorithms which allow humans to understand algorithmic decisions. Running parallel to this issue is an increasing reliance on algorithmically generated profiles to target advertisements online. Often these profiles are built on sensitive characteristics, without user knowledge or means of recourse. They can influence user perceptions of self, alter the content users are exposed to, and reveal to other parties characteristics which users have chosen not to share. This project aims to increase user autonomy and privacy online by leveraging techniques in explainable machine learning.
>
> This work begins by creating a prototype tool called Mockingbird that builds more than twenty algorithmically generated profiles based on Twitter data. These profiles are created using various techniques, including lexicons, neural networks, and Gaussian Processes. Mockingbird offers explanations for most of these profiles, primarily using a post-hoc explanatory tool. Finally, using synonym suggestions and techniques used to generate adversarial examples, Mockingbird gives users suggestions on how to alter their tweets in order to change their algorithmic profiles. Mockingbird is novel in combining profiles, explanations, and tools to change algorithmic profiles.

> The system was tested through several (n = 6) lab experiments to gauge user response to explanations and willingness to alter their data. It appears that users are generally not concerned about their algorithmic profiles when used for advertising, but would be much more concerned in higher stakes applications. Users were also unwilling to change their existing data to control algorithmically generated profiles, viewing the necessary changes as too disruptive to how they use social media. This work points to avenues of further research focusing explicitly on editing social media data to influence high stakes decisions such as job, visa, and loan applications."

The full text is available on my [GitHub](https://github.com/ahare63/mockingbird/blob/master/docs/mockingbird_report.pdf), the [Oxford University Research Archive](https://ora.ox.ac.uk/objects/uuid:48898f6d-f06e-4495-82a2-4a131758f097), and the [Department of Computer Science website](https://www.cs.ox.ac.uk/msctheses/1716/) (requires Oxford login).

**Relevant Coursework**

- "Advanced Machine Learning" - A new course focused on deep learning applications in NLP and Bayesian approaches to model fitting. See [Projects](/projects) for more information on the final project.
- "Artificial Intelligence" - An introduction to AI, with a focus on search algorithms and problem formulation. Several practicals in Java.

- "Computational Learning Theory" - A high-level approach to the bounds of machine learning, with a focus on Probably Approximately Correct (PAC) learning and its variants. Heavy on proofs, challenging but interesting.
- "Computers in Society" - An interdisciplinary look at the ethical questions raised by computers and information technology in the modern age.

- "Databases" - A general course on databases, using PostgreSQL. Covers the theory behind the design of database systems (relational algebra, relational calculus, etc), the actual practical SQL programming, and some information on how SQL works behind the scenes.
- "Database Systems Implementation" - An expansion of the Databases course from the previous term, with a focus on implementation in C++. Final project involved implementing concepts not yet standard, such as skew-sensitive processing (conducted in Python using the pandas library).

- "Foundations of Computer Science" - Since this degree is a conversion from Operations Research to Computer Science for me, I took this course to ensure I have all of the underlying theory I need. Focuses on basic models of computation (DFA, PDA, Turing Machines), reductions, and some complexity theory.

### Princeton University (September 2014-June 2018)

![Princeton University shield](/images/about/03939735f51185a4a253aa425a36a7d0.jpg)

Princeton, New Jersey

**At a Glance**

- **Major:** Operations Research & Financial Engineering (ORFE)
- **Minor:** Applications of Computing

- **Degree Type:** Bachelor of Science in Engineering (BSE)
- **GPA:** 3.9/4.0

- **Honors:** magna cum laude, Tau Beta Pi, Sigma Xi, S. S. Wilks Memorial Prize

**Why I Chose My Major**

My major, Operations Research and Financial Engineering (ORFE for short), is a bit of an odd one. My interest in it mostly comes from the operations research end. I saw the degree as a mix between computer science, data science, optimization, statistics, probability, economics, and finance. This appealed to me, as I knew I could get the foundations of computer science in addition to a formal and rigorous education in these other quantitative disciplines. I'm most interested in topics where different fields interact and together work to solve a complex problem, and this program gave me several tools and approaches in this vein that I may not have received from a pure computer science degree. Perhaps as importantly, understanding data is a core part of any machine learning approach and ORFE is at its core a data-driven major. My senior thesis (see below) drew its conclusions using machine learning, but my ability to reason critically and concretely about data was equally as important to the project's success. By minoring in Applications of Computing and now pursuing a further degree in Computer Science, I am able to leverage what I've learned in ORFE to better solve problems in the computer science field.

**Senior Thesis**

For more on the thesis, see [Projects](/projects).

As part of their senior year, every Princeton student (with a few departmental exceptions) is required to submit a thesis. These tend to be year-long research projects conducted one-on-one with a departmental advisor. For my project, I tried to apply machine learning to the classification of "fake news" and satire. It was important to me to work on a project that was both relevant and interesting to me and this problem caught my attention early on. Here is the abstract:

> "The problem of false news articles has recently surged to the front of political discussion, particularly in the United States. Misinformation comes from a wide range of sources and major social media companies such as Facebook and Google have taken steps towards reducing the spread of so-called “fake news.” By their nature, many such deceptive news articles are difficult for humans to identify, as there may be conflicting reports, different interpretations of information, or a widespread distortion of the facts as the story circulates. While the notion of objective truth is one best left to the philosophers, it may be possible to make in-roads by studying a related category of articles: satire. Satirical articles often arise as part of the discussion when they are taken as fact by their readers and shared in a way to confuse a large part of the public. Many guides to “fake news" contain mostly websites that claim to be satirical. This is often not easy to verify as the satirical disclaimer may be hidden deep in the website's description. The ability to reliably and automatically categorize this subset of articles from the main body of news would be a useful tool to warn readers not to accept the article as fact.
>
> As standards and norms for politics and society change, so too must standards for news and satire. For this reason, this thesis considers a number of subsets of the data, based on date of publication. By considering both the corpus as a whole and the subsets individually, the goals of this paper are to A) develop an effective machine learning approach to identifying satire and B) see if a changing political and social climate has affected news and satire in a way discernible to a machine learning algorithm.

> For the purposes of labeling the data, articles coming from sites explicitly claiming to be satirical are labeled as “satire,” and the rest "serious.” The problem of separating satire from serious news is analogous to separating valid email from spam. For this reason, this paper uses many of the most common techniques from the field of spam filtering such as a Support Vector Machine with a linear kernel. The SVM uses a number of features established other works, chiefly a bag of words, and two new features based on links to Twitter and other websites. This thesis also implements a deep learning approach with a C-LSTM.
>
> The SVM with all features consistently achieved over 99% accuracy, 95% precision, and 96% recall when comparing satirical articles to serious ones. The C-LSTM achieved just under 99% accuracy with about 90% precision and recall. It was found that the "fake news" category is easier to separate from serious news but may share similarities with satire. Lastly, this thesis found that the date of publication is a significant factor in identifying satirical articles and that serious news from the past two years may be more similar to older satirical articles than previously."

**Semester Abroad**

As part of my time at Princeton, I spent one semester at Worcester College of the University of Oxford. This amounted to Hilary and Trinity Terms and consisted of four courses in Mathematics and Computer Science. These courses introduced me to Oxford's individualistic style of learning and emphasis on self-driven study. Each course was taught one-on-one and pushed me to explore on my own. In my Machine Learning course, I was expected to learn basic Python, JavaScript, and HTML in just one week so that I could finish practicals and work on my research project. I found the approach a good fit and the work very rewarding, which is why I decided to return to Oxford for my Master's.

![Worcester College, Oxford arms](/images/about/9c266c7c5d11aa55a917484bc58dbe58.jpg)

**Relevant Coursework**

_At Princeton_

- "Computing & Optimization for the Physical and Social Sciences" - This ORFE course mixed proof-based math with MATLAB to teach approaches to solving convex optimization problems. This included regression, convex analysis, semi-definite and linear programming, gradient descent methods, relaxation of hard or intractable problems, and reduction.
- "Information Security" - This class covered topics in online and occasionally physical security. It melded theory with current applications and projects (in Java and Python) included implementing the Diffie-Hellman key exchange algorithm, using SQL injections and CSRF attacks to gather information from websites, and using computer forensics on a simulated target computer.

- "Data Structures & Algorithms" - Based in Java, this course focused on fundamental data structures (trees, graphs, lists) and algorithms (sorts, flow on graphs). It also included higher level methods for thinking about the efficiency of these approaches (time/space complexity, reduction, tractability).
- "Intro to Programming Systems" - Using C and occasionally x86-64 assembly, this course taught the lower-level basics of computers, including pointers, threading, and memory allocation. Projects included creating a buffer overflow attack and building a Linux shell.

- "Regression & Applied Time Series" - This ORFE class used a financial lens to consider concepts such as the Gaussian Copula, quantiles, Monte Carlo simulation, basic regression techniques (autoregressive, moving average, least squares), and time series. Projects written in R included both simulations and analyses of real world data.
- "Transportation Systems Analysis" - An ORFE course that covered the history and future of transportation in the world, largely from an optimization perspective. A major focus was on autonomous vehicles, and I worked on a project in Java for assigning routes to hypothetical autonomous taxis in a simulated city.

- "Probability & Stochastic Systems" - Cross-listed with the Math department, this ORFE class provided a rigorous mathematical approach to topics in probability including Poisson processes, Brownian Motion, and Markov Chains. After completing this class myself, I tutored another student in it through the university.
- "Fundamentals of Statistics" - An introduction to probability and statistics in MATLAB.

- "Networks: Friends, Money, and Bytes" - An Electrical Engineering/Computer Science course that addressed twenty major topics in modern networks, including PageRank, rating systems, online courses, and Internet protocols. The final team project used MATLAB to analyze the New York City subway system as a graph, finding which stations and lines were most important to overall network flow.
- "Linear Programming & Optimization" - A course dedicated entirely to linear programming and its applications, written in AMPL. The final project used SVMs to process handwriting.

_At Oxford_

- "Machine Learning" - An introductory course for ML, we covered topics such as regression, SVMs, neural networks, collaborative filtering, regularization, and LASSO. A large part of the class was centered around my project which used a neural network and collaborative filtering to attempt to predict my Facebook friend's political leanings from their page likes - see [Projects](/projects) for more details.
- "Computational Game Theory" - This was a high-level approach to game theory, covering topics such as Nash equilibria, mixed strategies, voting methods, and auction theory.

- "Graph Theory" - A class in mathematics, it provided a basic foundation for graph theory including coloring, Euler paths, graph searching algorithms, trees, and reachability. It also helped me to formalize my proofs.
- "Computational Linguistics" - An introduction to the field, this class focused on how to consider language computationally, focusing mostly on vectorization.

**Other Activities**

- McGraw Center Tutor. For three years, I worked weekly at the McGraw center, teaching current Princeton students courses I'd already taken. These included Calculus I and II, Linear Algebra, Physics I, Microeconomics, and Macroeconomics. I enjoyed these sessions and believe they helped improve my ability to communicate with others and explain complex ideas simply.
- Global Ambassador. After my semester at Oxford, I volunteered a few times to be a resource for other students considering study abroad. This included meeting directly with students, being on panels, and communicating over email.

- Tau Beta Pi. My senior year I joined Tau Beta Pi, an engineering honor society limited to the top 1/5 of the engineering class. As part of this program, I led a weekly tour of the Engineering Quadrangle to prospective students, explaining the kind of work each department does and what my experience had been.
