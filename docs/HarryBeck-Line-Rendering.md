This rendering logic is known as **Octilinear Routing** with **Corner Filleting**.

In a Harry Beck-style map (schematic map), the chaotic geography of the real world is simplified into straight line segments that are restricted to three angles: horizontal (), vertical (), and diagonal ().

Here is the step-by-step logic to calculate the path and bends between two stations on your  grid.

---

### Phase 1: The Routing Logic (Finding the "Knee")

When connecting Station A  to Station B , you rarely draw a direct line. Instead, you look for an intersection point (a "knee" or "waypoint") that allows you to connect them using only , , and  lines.

To decide the path and the type of bend, you calculate the differences in coordinates:


#### Scenario 1: The Straight Shot (No Bend)

If  (vertical alignment),  (horizontal alignment), or  (perfect diagonal alignment), you draw a single straight line. No calculation is needed for bends.

#### Scenario 2: The 45-Degree Transition (Standard Beck Style)

If the stations are not aligned, you usually want a path that combines a **diagonal segment** with a **straight (H or V) segment**. This creates the classic "soft" 45-degree bend.

**The Logic:**
You want to travel diagonally as long as possible until you line up with the target on one axis, then travel straight for the rest.

1. **Identify the shorter distance:**
Let .
2. **Calculate the Knee Point ():**
You travel diagonally from Start  by the amount of the *shorter distance*.
* Direction signs:  and .
* 
* 


3. **The Result:**
* The path goes from **Start**  **Knee**  **End**.
* One segment is Diagonal. The other is Horizontal or Vertical.
* **Bend Type:** This mathematically forces a **45-degree bend**.



#### Scenario 3: The 90-Degree L-Bend

Sometimes, you cannot use a diagonal (perhaps due to obstacles or aesthetic choice). You must connect using only Horizontal and Vertical lines.

1. **The Knee Point:**
You simply project horizontal from start and vertical from end (or vice versa).
* 
* 


2. **The Result:**
* **Bend Type:** This forces a **90-degree bend**.



---

### Phase 2: Smoothing the Bend (Rendering)

Once you have your three points—**Start**, **Knee**, and **End**—you have a sharp, jagged polyline. To get the "smoothly bent" look, you apply a geometric operation called **Corner Filleting** (or rounding).

You do not bend the line *at* the stations; you bend it at the "Knee" point calculated above.

#### The Algorithm for Smoothing:

1. **Define a Radius ():** Pick a standard bend radius (e.g., 20 pixels) for your map.
2. **Shorten the Segments:**
Move back from the "Knee" point along both line segments by distance .
* Point  is on the incoming line, distance  away from the Knee.
* Point  is on the outgoing line, distance  away from the Knee.
* *(Note: For a simple circular arc,  is calculated using trigonometry based on the bend angle : ).*


3. **Draw the Curve:**
Draw a curve (usually a Quadratic Bézier curve or a circular arc) connecting  to .
* If using a Bézier curve, the "Knee" point itself serves as the **Control Point**.



---

### Summary Table: How to decide the bend?

To automate this on your grid, use this decision tree:

| Condition | Logic | Resulting Shape | Bend Angle |
| --- | --- | --- | --- |
| **** | Vertically aligned | Straight Line | None |
| **** | Horizontally aligned | Straight Line | None |
| **** | Diagonally aligned | Straight Line | None |
| **** | Misaligned | **Greedy Diagonal:** Move diagonally for the length of the shorter delta, then straight. | **45 Degree** |

**Example Calculation:**

* **Station A:** 
* **Station B:** 
* **Deltas:** , .

**Logic:**

1.  (4) is smaller than  (10).
2. We must travel diagonally for 4 units to "clear" the Y-height difference.
3. **Knee Point:** Start at , add 4 to both  and  (since target is positive in both).
* Knee = 


4. **Path:** .
5. **Segments:**
* Segment 1: Diagonal 
* Segment 2: Horizontal 


6. **Bend:** The intersection at  joins a Diagonal and a Horizontal, creating a **45-degree bend**.

Would you like me to provide a pseudocode example of calculating these knee points?