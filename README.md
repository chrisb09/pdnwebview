# Show [paint.net](getpaint.net) projects in a browser.

This project renders the output of [pdnexport](https://gitlab.com/christianbrinkmann/pdnexport) python script in a browser.

# Installation

1. Clone pdnexport repo
2. Export one or multiple .pdn project files using pdnexport to a path available on web (somewhere like /var/www/paint/data if you're running a linux based server)
3. Clone this repository to the folder containing the exported data directory (like /var/www/paint)

# Usage

Specify the name(s) of the files you want to show in the path using `?id=abcd&id=cdef` (replace `abcd` and `cdef` with actual project file names).

So in our example, if your domain were `example.com` then you should open
`example.com/paint/?id=abcd&id=cdef`

# Demo

It looks something like this:

![Large screenshot of the program](screenshots/example.png)

A screenshot might be nice, but there's nothing better than just trying it out yourself at my [website](https://christian-f-brinkmann.de/paint/?id=Zaubertrank%20logo&id=testimage&id=singlecolor&id=Windows%20Mac%20Linux%20Logo%202025).