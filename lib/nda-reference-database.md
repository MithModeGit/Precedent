# NDA Reference Database

This file is the authoritative legal knowledge base injected into every Pass 2 redline generation prompt. It is also injected into the Pass 3 evaluation prompt as context for scoring.

INSTRUCTIONS FOR THE MODEL: When citing a source in a redline rationale, cite only sources named in this database. Do not invent case names, statute section numbers, law firm positions, or market authority references not present here. If you cannot ground a claim in a named source, write "per market practice" without naming a specific authority.

---

## PART 1: Binary Check Trigger Rules

These checks are mandatory for every document. Apply them before generating any clause-level redlines.

### DTSA Notice Check

TRIGGER: Signatory type is "individual" (one or more signatories is a named person, not only a company name).

CONDITION FOR FAIL: The NDA does not contain a whistleblower immunity notice substantially similar to the language below.

REQUIRED LANGUAGE (per 18 U.S.C. § 1833(b), Defend Trade Secrets Act of 2016):

"Pursuant to 18 U.S.C. § 1833(b), an individual shall not be held criminally or civilly liable under any federal or state trade secret law for the disclosure of a trade secret that (i) is made in confidence to a federal, state, or local government official, either directly or indirectly, or to an attorney, solely for the purpose of reporting or investigating a suspected violation of law, or (ii) is made in a complaint or other document filed in a lawsuit or other proceeding, if such filing is made under seal. An individual who files a lawsuit for retaliation by an employer for reporting a suspected violation of law may disclose the employer's trade secret to the attorney of the individual and use the trade secret information in the court proceeding, if the individual files any document containing the trade secret under seal and does not disclose the trade secret except pursuant to court order."

[Source: 18 U.S.C. § 1833(b)(1)-(2); Cooley LLP, New Employee and Independent Contractor Notice Requirements Under the Federal Defend Trade Secrets Act, May 2016]

CONSEQUENCE OF OMISSION: Employer loses the right to seek exemplary damages (up to two times actual damages) and attorney's fees in an action against the individual for willful and malicious misappropriation. [Source: 18 U.S.C. § 1833(b)(3)(C) cross-referencing § 1836(b)(3)(C)-(D)]

NOTE: This requirement applies only when an individual personally signs. Entity-to-entity NDAs where no individual is a signatory do not trigger this requirement. [Source: 18 U.S.C. § 1833(b)(3)(A)]

---

### California §16600 Check

TRIGGER: Governing law is California AND the NDA contains a non-solicitation or non-compete clause.

CONDITION FOR FAIL: A non-solicitation or non-compete clause is present in a California-governed NDA without a general solicitation carve-out and an unsolicited applicant exception.

RULE: California Business and Professions Code § 16600(a) provides: "Except as provided in this chapter, every contract by which anyone is restrained from engaging in a lawful profession, trade, or business of any kind is to that extent void." AB 1076 (effective January 1, 2024) codified Edwards v. Arthur Andersen LLP (Cal. Supreme Court 2008) and requires this section to be read broadly to void non-compete and non-solicitation provisions in employment contexts regardless of how narrowly tailored they are.

DRAFTING IMPLICATION: Any non-solicitation clause in a California-governed NDA must include at minimum: (a) a carve-out for general solicitations not targeted at specific employees (job postings, general advertisements), and (b) a carve-out for employees who initiate contact without solicitation by the other party.

[Source: Cal. Bus. & Prof. Code § 16600(a); AB 1076, Stats. 2023, Ch. 828, effective Jan. 1, 2024; Edwards v. Arthur Andersen LLP, 44 Cal.4th 937 (2008)]

---

### Trade Secret Term Bifurcation Check

TRIGGER: Every NDA.

CONDITION FOR FAIL: The NDA sets a single flat confidentiality term (e.g., "3 years from disclosure") without separately providing perpetual protection for trade secrets.

RULE: A time-limited NDA can defeat trade secret protection at term expiration. If the NDA's confidentiality period expires, the recipient may be free to use information that still qualifies as a trade secret under the Uniform Trade Secrets Act or DTSA. Bifurcation is the market-standard solution.

MARKET-STANDARD LANGUAGE: "The obligations of confidentiality in this Agreement shall remain in effect for [3] years from the date of disclosure; provided, however, that with respect to Confidential Information that constitutes a trade secret under applicable law, such obligations shall continue in effect for so long as such information remains a trade secret."

[Source: Silicon Image, Inc. v. Analogix Semiconductor, Inc., 642 F. Supp. 2d 957 (N.D. Cal. 2008) (time-limited NDAs can defeat trade secret protection at expiration); Gowling WLG, Protecting Trade Secrets Using Non-Disclosure Agreements]

---

### AI Training Carve-out Check

TRIGGER: Use case is "saas_vendor" or "ip_licensing."

CONDITION FOR FAIL: The NDA does not contain a prohibition on using Confidential Information to train AI or machine learning models.

RULE: Since 2025, the market standard for technology vendor and SaaS NDAs has evolved to include an explicit prohibition on using the Disclosing Party's Confidential Information to train, fine-tune, or otherwise improve AI or machine learning models. Practical Law's UK mutual NDA form now includes optional AI/ML drafting alternatives.

MARKET-STANDARD LANGUAGE: "Receiving Party shall not use Disclosing Party's Confidential Information to train, develop, fine-tune, test, or otherwise improve any artificial intelligence or machine learning model, system, or algorithm."

[Source: Practical Law (Thomson Reuters), Confidentiality agreement (mutual), UK edition, 2025 update noting optional AI/ML drafting alternatives]

PRIORITY: Should-Address for Standard mode. Must-Address for Aggressive mode.

---

### Internal Consistency Check

TRIGGER: Every NDA.

CONDITION FOR FAIL: Two or more generated redlines contradict each other. Examples: (a) one redline expands the definition of Confidential Information while another narrows the exclusions in a way that creates a logical conflict; (b) one redline proposes a 3-year term and another proposes perpetual protection for all information (not just trade secrets).

---

## PART 2: Clause Taxonomy and Market-Standard Positions

For each clause, positions are defined at three levels: Must-Address (material legal risk or compliance requirement), Should-Address (market-standard improvement), and Nice-to-Address (available but not necessary). The mode setting determines which levels to include.

---

### Clause 1: Definition of Confidential Information

FUNCTION: Defines the scope of information protected by the agreement. This is the most frequently redlined clause in commercial NDAs.

**Disclosing Party Standard (one-way NDA):** "All non-public information, in any form or medium, whether or not marked, designated, or otherwise identified as confidential, including oral disclosures, retroactive to disclosures made before the Effective Date."

**Receiving Party Objections:** "Whether or not marked" creates unbounded obligations and operational compliance problems. Retroactive coverage creates undisclosed liability for information already shared. Oral disclosures without a written confirmation requirement are difficult to track.

**Must-Address (Receiving Party):** Add a qualification that oral disclosures must be confirmed in writing within 30 days to be protected. Remove retroactive coverage (limit to disclosures on or after the Effective Date).

**Should-Address (Receiving Party):** Replace "whether or not marked" with a hybrid standard: information is protected if (a) marked confidential at the time of disclosure, (b) identified orally as confidential at the time of disclosure and confirmed in writing within 30 days, or (c) a reasonable person would understand it to be confidential given the nature of the information and circumstances of disclosure.

**Disclosing Party Counter-position:** Marking is operationally burdensome and risks forfeiture of contract-based protection if marking is not consistently done (see Convolve v. Compaq below). Propose the hybrid standard as a compromise.

**Market-Settled Position (Standard mode):** Broad CI definition using the hybrid trigger (marked, orally identified and confirmed, or reasonably understood to be confidential), with trade secrets expressly included, and a savings clause preserving statutory trade secret protections regardless of marking compliance.

**Trade Secret Savings Clause:** "Nothing in this Agreement shall be construed to limit or restrict the protection available to any trade secret under applicable law."

[Source: Practical Law, Standard Document: Confidentiality Agreement; Cooley GO, Form of Non-Disclosure Agreement (Mutual); Convolve, Inc. v. Compaq Computer Corp., 527 F. App'x 910, 925 (Fed. Cir. 2013)]

---

### Clause 2: Exclusions (Carve-outs)

FUNCTION: Identifies information that is not protected even if it falls within the CI definition. Four canonical carve-outs.

**The Four Standard Carve-outs:**

(a) Information that is or becomes generally available to the public through no act or omission of the Receiving Party.

(b) Information that was already known to the Receiving Party prior to its disclosure by the Disclosing Party, as evidenced by the Receiving Party's written records predating disclosure.

(c) Information that is rightfully received by the Receiving Party from a third party without restriction on disclosure.

(d) Information that is independently developed by the Receiving Party without use of or reference to the Disclosing Party's Confidential Information, as evidenced by the Receiving Party's written records.

**Must-Address:** Carve-out (d) must include "without use of or reference to." Without this qualifier, a recipient could use the CI to develop something and then claim independent development. [Source: market practice; Practical Law standard document commentary]

**Should-Address:** Carve-out (b) should specify that prior knowledge must be "evidenced by the Receiving Party's written records predating the date of disclosure." Without the records qualifier, the carve-out is difficult to establish and easy to assert falsely.

**Disclosing Party Counter-position on (b):** Require that records be "contemporaneous" rather than merely predating disclosure.

**Market-Settled Position:** Four carve-outs with: (b) requiring predating written records, (c) specifying "rightfully and non-confidentially received," (d) including "without use of or reference to."

[Source: Promise Legal, Mutual NDA Template for Startups (2025); Cooley GO, Form of Non-Disclosure Agreement (Mutual)]

---

### Clause 3: Obligations of the Receiving Party

FUNCTION: The core non-disclosure and use restriction.

**Standard Language:** Use restriction limited to the Permitted Purpose. Non-disclosure to third parties without consent.

**Must-Address:** Receiving Party must have express right to share with Representatives (employees, outside counsel, accountants, financial advisors) on a need-to-know basis, with Representatives bound by obligations at least as restrictive as those in the NDA. Without this, the Receiving Party technically cannot share CI with its own attorneys.

**Should-Address:** Define "Representatives" to include affiliates, with receiving party remaining liable for Representatives' breaches.

**Market-Settled Position:** Disclosure to Representatives on need-to-know; "at least as restrictive" obligation on Representatives; Receiving Party liable for any Representative's breach.

[Source: Practical Law, Standard Document: Confidentiality Agreement (Mutual)]

---

### Clause 4: Standard of Care

FUNCTION: Sets the duty of care for protecting CI.

**Market-Settled Position:** "The same degree of care the Receiving Party uses to protect its own confidential information of like nature, but in no event less than reasonable care." This dual standard is market-standard and rarely successfully negotiated away.

[Source: Cooley GO, What You Need to Know About The NDA]

**Nice-to-Address:** Some receiving parties seek to simplify to "reasonable care" alone, removing the "same degree" standard. This is a cosmetic change if the party's own security practices are at least reasonable; it only matters if the party's internal security is unusually lax.

---

### Clause 5: Permitted Disclosures (Representatives)

See Clause 3. Ensure the Representative list is specific and includes outside advisors.

---

### Clause 6: Compelled Disclosure

FUNCTION: Governs what happens if a Party is legally required to disclose CI (subpoena, regulatory inquiry, court order).

**Standard Language:** Notice to Disclosing Party plus cooperation to seek protective order, minimum necessary disclosure.

**Must-Address (Receiving Party):** Add "to the extent legally permitted" before the notice requirement. Gag orders in certain regulatory and law enforcement contexts legally prohibit notification. A mandatory notice requirement could itself be a violation of law.

**Should-Address (Receiving Party):** Add a carve-out for routine regulatory examinations by financial or industry regulators. Large companies are routinely examined by SEC, bank regulators, and similar bodies; requiring individual Disclosing Party notification for each routine exam is impractical.

**Market-Settled Position:** Notice "to the extent legally permitted," cooperation at Disclosing Party's expense, minimum necessary disclosure, carve-outs for routine regulatory exams and SEC whistleblower communications, DTSA whistleblower disclosure carve-out.

[Source: Martin Marietta Materials, Inc. v. Vulcan Materials Co., 56 A.3d 1072 (Del. 2012) (interpreting compelled disclosure mechanics and the notice-and-vetting requirement); 15 C.F.R. § 240.21F-17 (SEC Rule 21F-17 whistleblower carve-out)]

---

### Clause 7: Residuals Clause

FUNCTION: Optional clause that gives the Receiving Party the right to use information retained in the "unaided memory" of its personnel.

**Standard Position (Disclosing Party):** No residuals clause.

**Receiving Party Position:** Insert residuals covering ideas, concepts, know-how, and techniques retained in the unaided memory of personnel who had access to CI in the course of performing their obligations.

**Must-Address (Disclosing Party):** If accepting any residuals clause, require carve-outs for: (a) specific technical data and formulae, (b) customer identifying information, (c) information retained through intentional memorization, and (d) all information that qualifies as a trade secret under applicable law.

**Market-Settled Position by Context:**
- M&A and IP licensing: residuals almost always rejected entirely.
- SaaS and consulting: narrow residuals with all four carve-outs above are sometimes accepted.

[Source: Venable LLP, Residual Clauses in an NDA for M&A Transactions (2018); Wilson Sonsini Goodrich & Rosati, practitioner guidance on residuals]

---

### Clause 8: Term of Confidentiality Obligations

FUNCTION: How long the confidentiality obligations last.

**Standard (Disclosing Party):** Perpetual, or 5 years.

**Receiving Party Position:** 2 to 3 years for general information; trade secrets handled separately (see Trade Secret Term Bifurcation Check above).

**Must-Address:** Bifurcate the term. Flat perpetual terms for non-trade-secret CI are skeptically viewed by courts in California and New York and create operational uncertainty about destruction obligations.

**Market-Settled Position (Standard mode):** 3 years from disclosure for general Confidential Information (3 years is the modal commercial NDA term per market surveys); perpetual or "for so long as such information constitutes a trade secret under applicable law" for trade secrets.

[Source: Cooley GO, What You Need to Know About The NDA; Silicon Image, Inc. v. Analogix Semiconductor, Inc., 642 F. Supp. 2d 957 (N.D. Cal. 2008); Gowling WLG, Protecting Trade Secrets Using Non-Disclosure Agreements]

---

### Clause 9: Return or Destruction

FUNCTION: What happens to CI when the agreement ends or at the Disclosing Party's request.

**Market-Settled Position:** Return or destroy all Confidential Information within 30 days of written request, with three mandatory carve-outs:
(a) One archival copy retained for legal and compliance purposes, subject to ongoing confidentiality obligations;
(b) Electronically stored copies in routine backup systems, subject to ongoing confidentiality obligations and to be deleted in the ordinary course of backup rotation;
(c) Information required to be retained by applicable law or regulation.

[Source: Practical Law, Standard Document: Confidentiality Agreement]

**Nice-to-Address:** Disclosing Party may seek mandatory return rather than destruction, and may seek officer certification of destruction. Both are negotiable concessions.

---

### Clause 10: Remedy and Injunctive Relief

FUNCTION: Establishes the Disclosing Party's right to seek injunctive relief without posting a bond.

**Must-Address (Disclosing Party):** Include: (a) acknowledgment that breach would cause irreparable harm for which monetary damages are an inadequate remedy; (b) express entitlement to seek injunctive relief and specific performance in addition to other available remedies; (c) waiver of any bond or security requirement.

**Why it matters:** Delaware courts have held that "contractual stipulations as to irreparable harm alone suffice to establish that element for the purpose of issuing injunctive relief." Without the contractual stipulation, the Disclosing Party must separately prove irreparable harm. [Source: Martin Marietta Materials, Inc. v. Vulcan Materials Co., 56 A.3d 1072, 1145-46 (Del. 2012)]

**Market-Settled Language:** "Each party acknowledges that a breach of this Agreement may cause the other party irreparable harm for which monetary damages would be an inadequate remedy, and that the non-breaching party shall be entitled to seek injunctive relief, specific performance, and other equitable relief without the requirement of posting any bond or other security in addition to any other remedies available at law or in equity."

---

### Clause 11: Governing Law

**Market-Settled Position for US-US deals:** Delaware is the modal choice for commercial NDAs between U.S. companies. New York is the second most common. California should be avoided when the NDA includes any non-solicitation or non-compete provisions, because of § 16600 exposure.

**Must-Address (Aggressive mode):** Delaware Court of Chancery is the dominant NDA interpretation forum for M&A and complex commercial disputes. For deals where Delaware enforcement is important, specify Delaware law with exclusive jurisdiction in the Delaware Court of Chancery. [Source: Martin Marietta Materials, Inc. v. Vulcan Materials Co., 56 A.3d 1072 (Del. 2012)]

---

### Clause 12: Non-Solicitation / Non-Hire

FUNCTION: Restricts the Parties from soliciting each other's employees during and after the NDA term.

**Standard (Aggressive version):** 24 months, "directly or indirectly," any employee with whom contact occurred.

**Must-Address (Receiving Party):** Reduce to 12 months, add carve-out for general solicitations not directed at specific individuals (job boards, general advertising), add carve-out for employees who respond to general solicitations without being directly targeted.

**Must-Address (both parties in California-governed NDA):** See California §16600 Check above.

**Market-Settled Position (Standard mode):** 12 months; limited to employees with whom the Receiving Party had substantive contact in connection with the Purpose; general solicitation and unsolicited applicant carve-outs included.

[Source: Lexology/Mintz, Negotiating Non-Disclosure Agreements; AMN Healthcare, Inc. v. Aya Healthcare Services, Inc., 28 Cal. App. 5th 923 (2018) (voiding employee non-solicit under Cal. § 16600)]

---

### Clause 13: Health Data and HIPAA Business Associate Agreement

FUNCTION: Governs disclosures of protected health information (PHI) when a HIPAA covered entity (such as a health system, provider, or health plan) shares identifiable patient data with a vendor or partner.

TRIGGER: The subject matter involves PHI, identifiable patient data, or any disclosure by a healthcare entity to a recipient that will create, receive, maintain, or transmit PHI on its behalf.

**Must-Address:** An NDA alone does not satisfy HIPAA. When a covered entity discloses PHI to a business associate, the parties must execute a HIPAA-compliant Business Associate Agreement (BAA), and the NDA should require it as a condition of disclosure and require the recipient to comply with the HIPAA Privacy and Security Rules. A missing BAA requirement is a material compliance gap, not a stylistic one. Recommend the redline reference the BAA requirement and recommend privacy counsel review; do not draft the full BAA inside the NDA. [Source: 45 C.F.R. §§ 164.502(e), 164.504(e) (business associate contract requirements); 45 C.F.R. §§ 164.308, 164.314 (administrative safeguards and organizational requirements)]

**Should-Address:** Add an express statement that PHI may be used and disclosed only as permitted by the BAA and applicable law, and that the recipient will report any breach of unsecured PHI without unreasonable delay.

---

### Clause 14: Cross-Border Data Protection

FUNCTION: Governs transfers of personal data subject to the EU General Data Protection Regulation (EU GDPR) or the UK GDPR, including transfers outside the EEA or the UK.

TRIGGER: The document involves personal data of EU/EEA or UK individuals, or a transfer of personal data outside the EEA or the United Kingdom.

**Must-Address:** A generic promise to "implement appropriate Standard Contractual Clauses" is insufficient. The clause should identify the specific transfer mechanism: the EU Commission's 2021 Standard Contractual Clauses (Implementing Decision (EU) 2021/914) and the applicable module (for example, controller-to-processor), and for UK transfers the UK International Data Transfer Agreement or Addendum. Following Schrems II, a transfer impact assessment is also expected. Flag vague or unspecified SCC references. [Source: EU GDPR Art. 46; Implementing Decision (EU) 2021/914 (2021 SCCs); Case C-311/18, Data Protection Commissioner v. Facebook Ireland and Schrems (CJEU 2020)]

**Should-Address:** Recommend a separate Data Processing Addendum (DPA) for any sustained processing relationship rather than embedding data-protection terms in the NDA, and recommend privacy counsel review. This is outside the standard NDA playbook; do not fabricate authority beyond the sources above.

---

### Clause 15: Pre-Existing and Independently Developed IP

FUNCTION: Protects each party's background intellectual property where an NDA contains (often inadvisably) an intellectual-property assignment, work-product, or "work made for hire" clause.

TRIGGER: The document contains an IP assignment, work-product, or work-made-for-hire provision (atypical in a pure NDA, common when an NDA is overloaded with services terms).

**Must-Address:** Add a carve-out excluding from any assignment the assigning party's pre-existing intellectual property and any IP independently developed without use of or reference to the Confidential Information. Without it, an individual or vendor may inadvertently assign background code, libraries, tools, or methodologies. Consider recommending the assignment be moved to a separate services or consulting agreement. [Source: market practice; consistent with the independent-development principle in Clause 2 carve-out (d)]

---

### Clause 16: Defined-Terms and Reference Integrity

FUNCTION: Ensures the agreement is internally complete and enforceable.

**Must-Address:** Every operative capitalized term that is used in the obligations (for example "Effective Date", "Representatives", "Affiliates", "Purpose", "Permitted Purpose") must be defined. An undefined operative term, an undefined "Effective Date" that anchors term or survival periods, or a reference to a non-existent Exhibit, Schedule, or Section is a material drafting defect that undermines enforceability. Flag each and propose a definition or correction. [Source: market practice; basic contract-construction principles]

---

## PART 3: Key Case Summaries

### Martin Marietta Materials, Inc. v. Vulcan Materials Co., 56 A.3d 1072 (Del. 2012)

COURT: Delaware Supreme Court (affirming Delaware Court of Chancery, C.A. No. 7102-CS, May 4, 2012).

HOLDING: An NDA without an express standstill provision nonetheless barred a hostile bid where the use clause restricted Confidential Information to "evaluating a Transaction" defined as a consensual deal. The Delaware Supreme Court also held that contractual stipulations as to irreparable harm alone are sufficient to establish that element for injunctive relief, and that non-reliance and waiver clauses bar fraud claims based on alleged diligence misstatements.

DRAFTING IMPLICATIONS: (1) The permitted purpose definition is substantive: narrowing it to "consensual transactions" can functionally substitute for an express standstill. (2) Include an irreparable harm stipulation and bond waiver. (3) Non-reliance clauses in NDAs bar fraud claims.

---

### Convolve, Inc. v. Compaq Computer Corp., 527 F. App'x 910 (Fed. Cir. 2013)

HOLDING: Failure to comply with the NDA's confidentiality-marking procedure precluded both contract and California UTSA trade secret claims. A written NDA supplants any implied duty of confidentiality, so the contract's marking requirements govern.

DRAFTING IMPLICATION: Use the hybrid trigger for CI (marked, orally identified, or reasonably understood) rather than a marking-only trigger, to avoid Convolve-style forfeiture. Always include a trade secret savings clause preserving statutory protection regardless of marking compliance.

---

### Silicon Image, Inc. v. Analogix Semiconductor, Inc., 642 F. Supp. 2d 957 (N.D. Cal. 2008)

HOLDING: A time-limited NDA can defeat trade secret protection at the expiration of the confidentiality period.

DRAFTING IMPLICATION: Always bifurcate the confidentiality term: a defined period (2 to 5 years) for general Confidential Information, and perpetual protection (or "for so long as such information constitutes a trade secret under applicable law") for trade secrets specifically.

---

### Brown v. TGS Management Co., LLC, 57 Cal. App. 5th 303 (2020)

HOLDING: Overly broad confidentiality provisions can be void as de facto noncompetes under California Business and Professions Code § 16600. The court held that provisions that are "so pervasive and all-encompassing that they operate as a de facto non-compete provision" are unenforceable.

DRAFTING IMPLICATION: In California-governed NDAs, the CI definition must be carefully tailored and not so broad that it prevents an individual from using their general professional knowledge in future employment.

---

### nClosures Inc. v. Block & Co., Inc., 770 F.3d 598 (7th Cir. 2014)

HOLDING: An NDA is unenforceable where the disclosing party failed to take reasonable steps to protect its confidential information: no NDAs with other recipients, no marking of documents, no access restrictions.

DRAFTING IMPLICATION: NDA enforceability depends on operational security. The agreement alone is insufficient if the disclosing party does not practice what the NDA requires.

---

### PepsiCo, Inc. v. Redmond, 54 F.3d 1262 (7th Cir. 1995)

HOLDING: Foundational inevitable disclosure doctrine case under Illinois UTSA. A 6-month injunction was granted against a senior executive joining a competitor, even without evidence of actual misappropriation, because the executive would inevitably rely on former employer's trade secrets.

DRAFTING IMPLICATION: In inevitable-disclosure jurisdictions (NY, IL, IN), an irreparable harm stipulation combined with injunctive relief language has real enforcement force. Rejected in California.

---

### In re D.E. Shaw & Co., L.P., Exchange Act Release No. 98641 (Sept. 29, 2023)

HOLDING: SEC imposed a $10 million penalty against a registered investment adviser for confidentiality language and deferred compensation releases that violated SEC Rule 21F-17(a) by impeding employees from communicating with the SEC about potential securities law violations.

DRAFTING IMPLICATION: NDAs for SEC-regulated entities must include an explicit carve-out for SEC whistleblower communications. The DTSA notice alone is not sufficient.

---

### In re The Brink's Company, Exchange Act Release No. 95138 (June 22, 2022)

HOLDING: SEC imposed a $400,000 penalty for NDA language that violated Rule 21F-17. The SEC required SEC-specific carve-out language beyond the DTSA whistleblower notice.

DRAFTING IMPLICATION: For SEC-regulated entities, include both the DTSA notice and a specific SEC Rule 21F-17 carve-out: "Nothing in this Agreement prohibits either Party from reporting possible violations of federal law or regulation to any governmental agency or regulatory body, including the Securities and Exchange Commission, or from making other disclosures that are protected under the whistleblower provisions of applicable law."

---

## PART 4: Counterparty Response Predictions by Clause Type

Use these predictions to populate the `counterpartyPrediction` field in redline output.

| Clause | Receiving Party Redline | Expected Counterparty Response | Recommended Fallback |
|---|---|---|---|
| CI Definition | Add hybrid trigger (marked, oral confirmed, or reasonably understood) | Disclosing party will likely accept the hybrid standard; it is market-standard and the Convolve risk benefits both parties | Offer to add the trade secret savings clause as a standalone concession if they resist the hybrid trigger |
| Exclusions (d) | Add "without use of or reference to" | Disclosing party will push back, arguing the qualifier makes independent development impossible to prove | Accept "without material use of" as a compromise |
| Residuals | Insert narrow residuals with trade secret carve-out | In M&A context: likely rejected. In SaaS context: likely accepted with expanded carve-outs | If rejected, strengthen the independent development carve-out instead |
| Term bifurcation | Split general term (3 years) from trade secret term (perpetual) | Receiving party will often push for 2 years on general term. Disclosing party will likely accept bifurcation as the trade-off | Accept 2 years for general term in exchange for the bifurcation |
| Non-solicitation | Reduce to 12 months with carve-outs | Disclosing party will push for 18 months | Accept 15 months with all carve-outs intact |
| Compelled disclosure | Add "to the extent legally permitted" | Disclosing party will want strict notice. Courts support the legal-limitation qualifier | Keep the qualifier; offer to add that notice will be given as promptly as legally possible |
| Bond waiver | Accept Disclosing Party's bond waiver request | Receiving party rarely pushes back on this; it rarely changes practical outcomes | Accept as a trading chip to win on substantive positions |
